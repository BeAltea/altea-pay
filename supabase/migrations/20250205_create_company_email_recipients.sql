-- Migration: Create company_email_recipients table
-- Date: 2025-02-05
-- Description: Table to store email recipients for bulk email sending feature

-- Create table for email recipients per company
CREATE TABLE IF NOT EXISTS company_email_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_name TEXT,
  client_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, client_email)
);

-- Create index for faster lookups by company
CREATE INDEX IF NOT EXISTS idx_company_email_recipients_company_id
  ON company_email_recipients(company_id);

-- Enable Row Level Security
ALTER TABLE company_email_recipients ENABLE ROW LEVEL SECURITY;

-- Policy: Service role (admin) has full access
CREATE POLICY "Service role has full access to company_email_recipients"
  ON company_email_recipients
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE company_email_recipients IS 'Stores email recipients for bulk email sending per company';
COMMENT ON COLUMN company_email_recipients.company_id IS 'Reference to the company';
COMMENT ON COLUMN company_email_recipients.client_name IS 'Name of the recipient (optional)';
COMMENT ON COLUMN company_email_recipients.client_email IS 'Email address of the recipient';
