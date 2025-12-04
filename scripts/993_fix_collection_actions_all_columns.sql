-- Fix collection_actions table schema completely
-- Adds all missing columns and forces schema cache reload

-- Drop and recreate the table with all correct columns
DROP TABLE IF EXISTS collection_actions CASCADE;

CREATE TABLE collection_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_id uuid NULL, -- Can be null for bulk actions
  debt_id uuid NULL, -- Can be null for general notifications
  action_type text NOT NULL CHECK (action_type IN ('email', 'sms', 'whatsapp', 'call', 'letter')),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
  message text NOT NULL,
  sent_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE collection_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Companies can view their own collection actions"
  ON collection_actions FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Companies can insert their own collection actions"
  ON collection_actions FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Super admins can view all collection actions"
  ON collection_actions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_collection_actions_company_id ON collection_actions(company_id);
CREATE INDEX idx_collection_actions_customer_id ON collection_actions(customer_id);
CREATE INDEX idx_collection_actions_debt_id ON collection_actions(debt_id);
CREATE INDEX idx_collection_actions_sent_at ON collection_actions(sent_at DESC);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- Add comments
COMMENT ON TABLE collection_actions IS 'Stores all collection actions (emails, SMS, WhatsApp, etc.) sent to customers';
COMMENT ON COLUMN collection_actions.customer_id IS 'Customer who received the action (nullable for bulk actions)';
COMMENT ON COLUMN collection_actions.debt_id IS 'Related debt (nullable for general notifications)';
