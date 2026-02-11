-- Migration: Clean up ghost email records from 11/02/2026
-- Date: 2026-02-11
-- Description: Delete email tracking records that were saved locally but never sent via SendGrid
--              due to serverless function timeout. These records show "sent" but SendGrid received 0 requests.

-- Count records to delete (for verification)
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count
  FROM email_sent_tracking
  WHERE sent_at >= '2026-02-11T00:00:00Z'
    AND sent_at < '2026-02-12T00:00:00Z';

  RAISE NOTICE 'Deleting % ghost email records from 2026-02-11', record_count;
END $$;

-- Delete all email tracking records from 11/02/2026
-- These are ghost records: saved as "sent" locally but SendGrid never received them
DELETE FROM email_sent_tracking
WHERE sent_at >= '2026-02-11T00:00:00Z'
  AND sent_at < '2026-02-12T00:00:00Z';

-- Add a comment to document this cleanup
COMMENT ON TABLE email_sent_tracking IS 'Tracks sent emails for filtering and status reporting. Ghost records from 2026-02-11 were cleaned via migration.';
