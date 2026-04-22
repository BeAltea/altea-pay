-- Add localize_only role to user_role enum
-- This role provides access ONLY to the /localize page for Assertiva Localize demo

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'localize_only';

-- Note: After running this migration, you can create users with role='localize_only'
-- These users will:
-- - Be redirected to /localize after login
-- - Only have access to /localize page (blocked from all other dashboards)
-- - Be able to query CPF/CNPJ via Assertiva Localize API
