-- Add original_rate column to track the provider's actual rate
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS original_rate numeric NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.services.original_rate IS 'Original rate from the external SMM provider';