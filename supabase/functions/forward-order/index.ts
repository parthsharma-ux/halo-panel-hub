import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user's JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing order: ${orderId}`);

    // Fetch the order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, services(id, name, api_service_id, api_provider_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order fetch error:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify order belongs to user
    if (order.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to access this order' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const service = order.services;

    // Check if service has API integration
    if (!service?.api_service_id || !service?.api_provider_id) {
      console.log('Service does not have API integration, skipping forwarding');
      return new Response(
        JSON.stringify({ 
          success: true, 
          forwarded: false,
          message: 'Service does not have API integration'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the API provider
    const { data: provider, error: providerError } = await supabase
      .from('api_providers')
      .select('*')
      .eq('id', service.api_provider_id)
      .eq('is_active', true)
      .single();

    if (providerError || !provider) {
      console.error('Provider fetch error:', providerError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API provider not found or inactive'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Forwarding order to provider: ${provider.name}`);

    // Build the API request (standard SMM panel API format)
    const apiUrl = new URL(provider.api_url);
    apiUrl.searchParams.set('key', provider.api_key);
    apiUrl.searchParams.set('action', 'add');
    apiUrl.searchParams.set('service', service.api_service_id);
    apiUrl.searchParams.set('link', order.link);
    apiUrl.searchParams.set('quantity', order.quantity.toString());

    console.log(`Calling API: ${apiUrl.toString().replace(provider.api_key, '***')}`);

    // Send order to external API
    const response = await fetch(apiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseText = await response.text();
    console.log(`API Response: ${responseText}`);

    let apiResponse;
    try {
      apiResponse = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse API response:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid response from API provider',
          details: responseText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for API errors
    if (apiResponse.error) {
      console.error('API error:', apiResponse.error);
      
      // Update order status to reflect the error
      await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiResponse.error
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract external order ID
    const externalOrderId = apiResponse.order?.toString() || apiResponse.id?.toString() || null;

    if (externalOrderId) {
      console.log(`External order ID: ${externalOrderId}`);
      
      // Update order with external order ID and set to processing
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          external_order_id: externalOrderId,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Failed to update order:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        forwarded: true,
        externalOrderId,
        message: 'Order forwarded successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in forward-order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
