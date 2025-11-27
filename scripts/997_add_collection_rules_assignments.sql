-- Add columns to collection_rules table for assigning to companies and customers
ALTER TABLE collection_rules
ADD COLUMN IF NOT EXISTS active_for_companies uuid[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS active_for_customers uuid[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

-- Add comment explaining the columns
COMMENT ON COLUMN collection_rules.active_for_companies IS 'Array of company IDs this rule applies to. NULL means applies to all companies.';
COMMENT ON COLUMN collection_rules.active_for_customers IS 'Array of customer IDs this rule applies to. NULL means applies to all customers of selected companies.';
COMMENT ON COLUMN collection_rules.company_id IS 'If set, this rule belongs to a specific company (created by company admin). If NULL, it is a global rule (created by super admin).';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_collection_rules_companies ON collection_rules USING GIN(active_for_companies);
CREATE INDEX IF NOT EXISTS idx_collection_rules_customers ON collection_rules USING GIN(active_for_customers);
CREATE INDEX IF NOT EXISTS idx_collection_rules_company_id ON collection_rules(company_id);
