import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    console.log('Starting order status sync...');

    // Fetch all orders that have external_order_id and are not completed/cancelled
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        external_order_id,
        status,
        service_id,
        services (
          api_provider_id,
          api_providers (
            api_url,
            api_key,
            is_active
          )
        )
      `)
      .not('external_order_id', 'is', null)
      .in('status', ['pending', 'processing']);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      console.log('No orders to sync');
      return new Response(
        JSON.stringify({ message: 'No orders to sync', synced: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${orders.length} orders to sync`);

    let syncedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        const service = order.services as any;
        const provider = service?.api_providers;

        if (!provider || !provider.is_active) {
          console.log(`Skipping order ${order.id}: Provider not active or not found`);
          continue;
        }

        // Build the status check URL
        const statusUrl = new URL(provider.api_url);
        statusUrl.searchParams.set('key', provider.api_key);
        statusUrl.searchParams.set('action', 'status');
        statusUrl.searchParams.set('order', order.external_order_id);

        console.log(`Checking status for order ${order.id} (external: ${order.external_order_id})`);

        const response = await fetch(statusUrl.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          console.error(`API error for order ${order.id}: ${response.status}`);
          errorCount++;
          continue;
        }

        const result = await response.json();
        console.log(`Status response for order ${order.id}:`, result);

        // Handle error response from API
        if (result.error) {
          console.error(`API returned error for order ${order.id}:`, result.error);
          errorCount++;
          continue;
        }

        // Map external status to our status
        let newStatus = order.status;
        if (result.status) {
          const externalStatus = result.status.toLowerCase();
          if (externalStatus === 'completed') {
            newStatus = 'completed';
          } else if (externalStatus === 'partial') {
            newStatus = 'partial';
          } else if (externalStatus === 'cancelled' || externalStatus === 'canceled') {
            newStatus = 'cancelled';
          } else if (externalStatus === 'in progress' || externalStatus === 'inprogress' || externalStatus === 'processing') {
            newStatus = 'processing';
          } else if (externalStatus === 'pending') {
            newStatus = 'pending';
          }
        }

        // Update order with new status and counts
        const updateData: any = {};
        
        if (newStatus !== order.status) {
          updateData.status = newStatus;
        }
        
        if (result.start_count !== undefined && result.start_count !== null) {
          updateData.start_count = parseInt(result.start_count, 10);
        }
        
        if (result.remains !== undefined && result.remains !== null) {
          updateData.remains = parseInt(result.remains, 10);
        }

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('orders')
            .update(updateData)
            .eq('id', order.id);

          if (updateError) {
            console.error(`Error updating order ${order.id}:`, updateError);
            errorCount++;
          } else {
            console.log(`Updated order ${order.id}:`, updateData);
            syncedCount++;
          }
        } else {
          console.log(`No changes for order ${order.id}`);
        }

      } catch (orderError) {
        console.error(`Error processing order ${order.id}:`, orderError);
        errorCount++;
      }
    }

    console.log(`Sync complete. Synced: ${syncedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        message: 'Order status sync complete',
        total: orders.length,
        synced: syncedCount,
        errors: errorCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
