-- Migration: Add operator column to accounting_setup_rules
-- Date: 2025-02-10
-- Description: Adds operator field to support different comparison operators (=, <=, >=, entre)

-- Add operator column to accounting_setup_rules
ALTER TABLE accounting_setup_rules
ADD COLUMN IF NOT EXISTS operator VARCHAR(5) NOT NULL DEFAULT 'entre';

-- Add comment for documentation
COMMENT ON COLUMN accounting_setup_rules.operator IS 'Comparison operator: "=" (exact), "<=" (less than or equal), ">=" (greater than or equal), "entre" (between min_days and max_days)';

-- Update constraint to validate operator values
ALTER TABLE accounting_setup_rules
ADD CONSTRAINT check_operator_value CHECK (operator IN ('=', '<=', '>=', 'entre'));
