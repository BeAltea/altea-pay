-- Migration: Create accounting_setups and accounting_setup_rules tables
-- Date: 2025-02-09
-- Description: Tables to store accounting report configurations per company with profit percentage rules

-- Table to store accounting report setups/configurations per company
CREATE TABLE IF NOT EXISTS accounting_setups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Table to store the rules/conditions for each setup
CREATE TABLE IF NOT EXISTS accounting_setup_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setup_id UUID NOT NULL REFERENCES accounting_setups(id) ON DELETE CASCADE,
  min_days INTEGER NOT NULL DEFAULT 0,
  max_days INTEGER, -- NULL means unlimited (e.g., >= 181 days)
  profit_percentage NUMERIC(5,2) NOT NULL, -- AlteaPay profit percentage (0.00 to 100.00)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT check_profit_range CHECK (profit_percentage >= 0 AND profit_percentage <= 100),
  CONSTRAINT check_days_range CHECK (min_days >= 0 AND (max_days IS NULL OR max_days > min_days))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounting_setups_company_id
  ON accounting_setups(company_id);

CREATE INDEX IF NOT EXISTS idx_accounting_setup_rules_setup_id
  ON accounting_setup_rules(setup_id);

CREATE INDEX IF NOT EXISTS idx_accounting_setup_rules_sort_order
  ON accounting_setup_rules(setup_id, sort_order);

-- Enable Row Level Security
ALTER TABLE accounting_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_setup_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounting_setups
-- Super admins can manage all setups
CREATE POLICY "Super admins can manage all accounting_setups"
  ON accounting_setups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- RLS Policies for accounting_setup_rules
-- Super admins can manage all rules
CREATE POLICY "Super admins can manage all accounting_setup_rules"
  ON accounting_setup_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE accounting_setups IS 'Stores accounting report configurations per company';
COMMENT ON COLUMN accounting_setups.company_id IS 'Reference to the company this setup belongs to';
COMMENT ON COLUMN accounting_setups.name IS 'Name of the accounting setup (e.g., "Contrato Padrao VMAX 2025")';
COMMENT ON COLUMN accounting_setups.created_by IS 'Super admin user who created this setup';

COMMENT ON TABLE accounting_setup_rules IS 'Stores profit percentage rules for each accounting setup based on debt aging';
COMMENT ON COLUMN accounting_setup_rules.setup_id IS 'Reference to the parent accounting setup';
COMMENT ON COLUMN accounting_setup_rules.min_days IS 'Minimum days overdue for this rule (inclusive)';
COMMENT ON COLUMN accounting_setup_rules.max_days IS 'Maximum days overdue for this rule (inclusive). NULL means unlimited';
COMMENT ON COLUMN accounting_setup_rules.profit_percentage IS 'AlteaPay profit percentage for debts in this range (0-100)';
COMMENT ON COLUMN accounting_setup_rules.sort_order IS 'Order for displaying rules';

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_accounting_setup_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on accounting_setups
DROP TRIGGER IF EXISTS trigger_accounting_setups_updated_at ON accounting_setups;
CREATE TRIGGER trigger_accounting_setups_updated_at
  BEFORE UPDATE ON accounting_setups
  FOR EACH ROW
  EXECUTE FUNCTION update_accounting_setup_updated_at();
