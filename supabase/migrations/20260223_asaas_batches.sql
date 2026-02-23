-- Migration: Create asaas_batches table for batch operation tracking
-- Created: 2026-02-23

-- Batch types enum
DO $$ BEGIN
  CREATE TYPE asaas_batch_type AS ENUM (
    'charge_create',
    'charge_update',
    'charge_cancel',
    'notification',
    'sync'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Batch status enum
DO $$ BEGIN
  CREATE TYPE asaas_batch_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'completed_with_errors',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create asaas_batches table
CREATE TABLE IF NOT EXISTS asaas_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  results JSONB DEFAULT '[]',
  errors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_asaas_batches_company ON asaas_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_asaas_batches_status ON asaas_batches(status);
CREATE INDEX IF NOT EXISTS idx_asaas_batches_type ON asaas_batches(type);
CREATE INDEX IF NOT EXISTS idx_asaas_batches_created_at ON asaas_batches(created_at DESC);

-- RPC function to increment completed jobs atomically
CREATE OR REPLACE FUNCTION increment_batch_completed(batch_id UUID, result_data JSONB DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE asaas_batches
  SET
    completed_jobs = completed_jobs + 1,
    results = CASE
      WHEN result_data IS NOT NULL THEN results || jsonb_build_array(result_data)
      ELSE results
    END,
    started_at = COALESCE(started_at, NOW())
  WHERE id = batch_id;
END;
$$;

-- RPC function to increment failed jobs with error details
CREATE OR REPLACE FUNCTION increment_batch_failed(batch_id UUID, error_detail JSONB)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE asaas_batches
  SET
    failed_jobs = failed_jobs + 1,
    errors = errors || jsonb_build_array(error_detail),
    started_at = COALESCE(started_at, NOW())
  WHERE id = batch_id;
END;
$$;

-- RPC function to check and finalize batch
CREATE OR REPLACE FUNCTION check_and_finalize_batch(batch_id UUID)
RETURNS TABLE(is_complete BOOLEAN, final_status TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  batch_record RECORD;
  new_status TEXT;
BEGIN
  SELECT * INTO batch_record FROM asaas_batches WHERE id = batch_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'not_found'::TEXT;
    RETURN;
  END IF;

  -- Check if all jobs are processed
  IF (batch_record.completed_jobs + batch_record.failed_jobs) >= batch_record.total_jobs THEN
    -- Determine final status
    IF batch_record.failed_jobs = 0 THEN
      new_status := 'completed';
    ELSIF batch_record.completed_jobs = 0 THEN
      new_status := 'failed';
    ELSE
      new_status := 'completed_with_errors';
    END IF;

    -- Update batch status
    UPDATE asaas_batches
    SET
      status = new_status,
      completed_at = NOW()
    WHERE id = batch_id;

    RETURN QUERY SELECT true, new_status;
  ELSE
    RETURN QUERY SELECT false, batch_record.status::TEXT;
  END IF;
END;
$$;

-- RPC function to start batch processing
CREATE OR REPLACE FUNCTION start_batch_processing(batch_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE asaas_batches
  SET
    status = 'processing',
    started_at = NOW()
  WHERE id = batch_id AND status = 'pending';
END;
$$;

-- Enable RLS
ALTER TABLE asaas_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view batches from their company" ON asaas_batches
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can create batches for their company" ON asaas_batches
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Grant access to service role for worker operations
GRANT ALL ON asaas_batches TO service_role;
GRANT EXECUTE ON FUNCTION increment_batch_completed TO service_role;
GRANT EXECUTE ON FUNCTION increment_batch_failed TO service_role;
GRANT EXECUTE ON FUNCTION check_and_finalize_batch TO service_role;
GRANT EXECUTE ON FUNCTION start_batch_processing TO service_role;
