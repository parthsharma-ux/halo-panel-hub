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
    
    // Use service role for cron job access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting rate sync from providers...');

    // Get all active providers
    const { data: providers, error: providersError } = await supabase
      .from('api_providers')
      .select('*')
      .eq('is_active', true);

    if (providersError) {
      console.error('Failed to fetch providers:', providersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch providers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!providers || providers.length === 0) {
      console.log('No active providers found');
      return new Response(
        JSON.stringify({ success: true, message: 'No active providers', updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all services linked to providers
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, api_provider_id, api_service_id, original_rate')
      .not('api_provider_id', 'is', null)
      .not('api_service_id', 'is', null);

    if (servicesError) {
      console.error('Failed to fetch services:', servicesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch services' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!services || services.length === 0) {
      console.log('No linked services found');
      return new Response(
        JSON.stringify({ success: true, message: 'No linked services', updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalUpdated = 0;

    // Process each provider
    for (const provider of providers) {
      console.log(`Fetching services from provider: ${provider.name}`);

      try {
        // Build the API request URL
        const apiUrl = new URL(provider.api_url);
        apiUrl.searchParams.set('key', provider.api_key);
        apiUrl.searchParams.set('action', 'services');

        const response = await fetch(apiUrl.toString(), {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          console.error(`API error for provider ${provider.name}: ${response.status}`);
          continue;
        }

        const providerServices = await response.json();

        if (!Array.isArray(providerServices)) {
          console.error(`Invalid response from provider ${provider.name}`);
          continue;
        }

        // Create a rate map
        const rateMap = new Map<string, number>();
        providerServices.forEach((ps: { service: string | number; rate: string | number }) => {
          rateMap.set(String(ps.service), parseFloat(String(ps.rate)) || 0);
        });

        // Update services for this provider
        const providerLinkedServices = services.filter(s => s.api_provider_id === provider.id);

        for (const service of providerLinkedServices) {
          const newRate = rateMap.get(service.api_service_id!);

          if (newRate !== undefined && newRate !== service.original_rate) {
            const { error: updateError } = await supabase
              .from('services')
              .update({ original_rate: newRate })
              .eq('id', service.id);

            if (!updateError) {
              totalUpdated++;
              console.log(`Updated service ${service.id}: ${service.original_rate} -> ${newRate}`);
            } else {
              console.error(`Failed to update service ${service.id}:`, updateError);
            }
          }
        }

        console.log(`Processed ${providerLinkedServices.length} services from ${provider.name}`);

      } catch (error) {
        console.error(`Error processing provider ${provider.name}:`, error);
        continue;
      }
    }

    console.log(`Rate sync complete. Updated ${totalUpdated} services.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Synced rates from ${providers.length} provider(s)`,
        updated: totalUpdated 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in sync-rates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
