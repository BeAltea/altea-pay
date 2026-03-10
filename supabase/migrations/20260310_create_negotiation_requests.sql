-- Migration: Create negotiation_requests table
-- Date: 2026-03-10
-- Description: Table to track customer requests for discounts and installment plans
--              that require client admin approval before ASAAS payment modification

-- Create enum for request types
CREATE TYPE negotiation_request_type AS ENUM ('discount', 'installment', 'both');

-- Create enum for request status
CREATE TYPE negotiation_request_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- Create the negotiation_requests table
CREATE TABLE IF NOT EXISTS negotiation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relations
    agreement_id UUID REFERENCES agreements(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    vmax_id UUID, -- Reference to VMAX record if applicable

    -- Customer info (denormalized for faster queries)
    customer_name TEXT,
    customer_document TEXT, -- CPF/CNPJ
    customer_email TEXT,
    customer_phone TEXT,

    -- Original agreement info (snapshot at request time)
    original_amount DECIMAL(10,2) NOT NULL,
    original_due_date DATE,
    original_installments INTEGER DEFAULT 1,
    original_discount_percentage DECIMAL(5,2) DEFAULT 0,

    -- Request details
    request_type negotiation_request_type NOT NULL DEFAULT 'both',
    requested_discount_percentage DECIMAL(5,2), -- null = keep original
    requested_installments INTEGER, -- null = keep original
    requested_first_due_date DATE, -- null = keep original or use today + 7 days
    customer_justification TEXT,

    -- ASAAS payment tracking
    original_asaas_payment_id TEXT, -- Payment ID before modification
    new_asaas_payment_id TEXT, -- Payment ID after approval (new charge)

    -- Status and response
    status negotiation_request_status NOT NULL DEFAULT 'pending',
    admin_response TEXT, -- Response message from admin

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ, -- When admin approved/rejected
    responded_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Which admin responded
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who created (can be super_admin on behalf)
    created_by_role TEXT, -- 'user', 'super_admin', 'admin'

    -- Constraints
    CONSTRAINT valid_discount CHECK (
        requested_discount_percentage IS NULL OR
        (requested_discount_percentage >= 0 AND requested_discount_percentage <= 100)
    ),
    CONSTRAINT valid_installments CHECK (
        requested_installments IS NULL OR
        requested_installments >= 1
    )
);

-- Create indexes for common queries
CREATE INDEX idx_negotiation_requests_company ON negotiation_requests(company_id);
CREATE INDEX idx_negotiation_requests_customer ON negotiation_requests(customer_id);
CREATE INDEX idx_negotiation_requests_agreement ON negotiation_requests(agreement_id);
CREATE INDEX idx_negotiation_requests_status ON negotiation_requests(status);
CREATE INDEX idx_negotiation_requests_created_at ON negotiation_requests(created_at DESC);
CREATE INDEX idx_negotiation_requests_company_status ON negotiation_requests(company_id, status);
CREATE INDEX idx_negotiation_requests_customer_document ON negotiation_requests(customer_document);

-- Enable RLS
ALTER TABLE negotiation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can see all requests
CREATE POLICY "super_admins_all_access" ON negotiation_requests
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Company admins can see requests for their company
CREATE POLICY "company_admins_select" ON negotiation_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id = negotiation_requests.company_id
            AND profiles.role = 'admin'
        )
    );

-- Company admins can update requests for their company (approve/reject)
CREATE POLICY "company_admins_update" ON negotiation_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.company_id = negotiation_requests.company_id
            AND profiles.role = 'admin'
        )
    );

-- Users can see their own requests (by customer link or created_by)
CREATE POLICY "users_select_own" ON negotiation_requests
    FOR SELECT
    USING (
        -- User created the request
        created_by = auth.uid()
        OR
        -- User is linked to the customer
        EXISTS (
            SELECT 1 FROM customers
            WHERE customers.id = negotiation_requests.customer_id
            AND customers.user_id = auth.uid()
        )
        OR
        -- User document matches customer document
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.cpf_cnpj IS NOT NULL
            AND replace(profiles.cpf_cnpj, '[^0-9]', '') = replace(negotiation_requests.customer_document, '[^0-9]', '')
        )
    );

-- Users can create requests (will be validated in API)
CREATE POLICY "users_insert" ON negotiation_requests
    FOR INSERT
    WITH CHECK (true); -- API handles validation

-- Users can cancel their own pending requests
CREATE POLICY "users_cancel_own" ON negotiation_requests
    FOR UPDATE
    USING (
        created_by = auth.uid()
        AND status = 'pending'
    );

-- Service role has full access (for webhooks and background jobs)
CREATE POLICY "service_role_all" ON negotiation_requests
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_negotiation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER negotiation_requests_updated_at
    BEFORE UPDATE ON negotiation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_negotiation_requests_updated_at();

-- Add comment for documentation
COMMENT ON TABLE negotiation_requests IS 'Tracks customer requests for discounts and installment plans requiring admin approval';
COMMENT ON COLUMN negotiation_requests.request_type IS 'Type of request: discount only, installment change only, or both';
COMMENT ON COLUMN negotiation_requests.original_asaas_payment_id IS 'ASAAS payment ID that will be cancelled if approved';
COMMENT ON COLUMN negotiation_requests.new_asaas_payment_id IS 'New ASAAS payment ID created after approval with new terms';
COMMENT ON COLUMN negotiation_requests.created_by_role IS 'Role of the user who created the request (for audit)';
