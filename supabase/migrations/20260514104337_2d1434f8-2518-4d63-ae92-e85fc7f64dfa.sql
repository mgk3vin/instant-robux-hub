
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS roblox_api_key text,
  ADD COLUMN IF NOT EXISTS maturity_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders ALTER COLUMN gamepass_link DROP NOT NULL;
