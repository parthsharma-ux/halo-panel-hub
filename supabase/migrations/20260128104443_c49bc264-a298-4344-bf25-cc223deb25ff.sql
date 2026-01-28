-- Add api_provider_id column to services table to track which provider the service came from
ALTER TABLE public.services 
ADD COLUMN api_provider_id uuid REFERENCES public.api_providers(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_services_api_provider_id ON public.services(api_provider_id);

-- Add external_order_id column to orders table to track the provider's order ID
ALTER TABLE public.orders
ADD COLUMN external_order_id text;

-- Create index for external order lookups
CREATE INDEX idx_orders_external_order_id ON public.orders(external_order_id);