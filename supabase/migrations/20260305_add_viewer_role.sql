-- Add viewer role to user_role enum
-- This role provides read-only access to the super-admin panel

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'viewer';

-- Note: After running this migration, you can create users with role='viewer'
-- These users will:
-- - Have read-only access to super-admin pages
-- - See a demo banner indicating read-only mode
-- - Have action buttons hidden via ReadOnlyGuard component
-- - Be filtered to their assigned company_id (if set)
