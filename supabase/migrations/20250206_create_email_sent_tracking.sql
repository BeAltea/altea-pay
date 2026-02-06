-- Migration: Create email_sent_tracking table
-- Date: 2025-02-06
-- Description: Table to track sent emails with status for filtering and reporting

-- Create enum for email status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_send_status') THEN
    CREATE TYPE email_send_status AS ENUM ('sent', 'failed');
  END IF;
END$$;

-- Create table for email tracking
CREATE TABLE IF NOT EXISTS email_sent_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES company_email_recipients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email_subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status email_send_status NOT NULL DEFAULT 'sent',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_email_sent_tracking_user_id
  ON email_sent_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_email_sent_tracking_company_id
  ON email_sent_tracking(company_id);

CREATE INDEX IF NOT EXISTS idx_email_sent_tracking_sent_at
  ON email_sent_tracking(sent_at DESC);

-- Composite index for filtering by company and user
CREATE INDEX IF NOT EXISTS idx_email_sent_tracking_company_user
  ON email_sent_tracking(company_id, user_id);

-- Enable Row Level Security
ALTER TABLE email_sent_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Service role (admin) has full access
CREATE POLICY "Service role has full access to email_sent_tracking"
  ON email_sent_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE email_sent_tracking IS 'Tracks sent emails for filtering and status reporting';
COMMENT ON COLUMN email_sent_tracking.user_id IS 'Reference to the recipient in company_email_recipients';
COMMENT ON COLUMN email_sent_tracking.company_id IS 'Reference to the company';
COMMENT ON COLUMN email_sent_tracking.email_subject IS 'Subject line of the sent email';
COMMENT ON COLUMN email_sent_tracking.sent_at IS 'Timestamp when email was sent';
COMMENT ON COLUMN email_sent_tracking.sent_by IS 'Admin user who sent the email';
COMMENT ON COLUMN email_sent_tracking.status IS 'Status of the email send (sent or failed)';
COMMENT ON COLUMN email_sent_tracking.error_message IS 'Error details if status is failed';
