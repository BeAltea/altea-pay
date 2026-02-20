-- Migration: Create queue_logs table for BullMQ job tracking
-- Run this migration in Supabase SQL Editor

-- Create queue_logs table
CREATE TABLE IF NOT EXISTS public.queue_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL,
    job_id TEXT NOT NULL,
    job_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'processing')),
    data JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    attempts INTEGER DEFAULT 1,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_queue_logs_queue_name ON public.queue_logs(queue_name);
CREATE INDEX IF NOT EXISTS idx_queue_logs_status ON public.queue_logs(status);
CREATE INDEX IF NOT EXISTS idx_queue_logs_job_id ON public.queue_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_queue_logs_processed_at ON public.queue_logs(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_logs_created_at ON public.queue_logs(created_at DESC);

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_queue_logs_queue_status ON public.queue_logs(queue_name, status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.queue_logs ENABLE ROW LEVEL SECURITY;

-- Create policy: Only super_admin can view logs
CREATE POLICY "Super admins can view all queue logs"
    ON public.queue_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'super_admin'
        )
    );

-- Create policy: Service role can insert logs (used by workers)
CREATE POLICY "Service role can insert queue logs"
    ON public.queue_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Create policy: Service role can update logs
CREATE POLICY "Service role can update queue logs"
    ON public.queue_logs
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.queue_logs IS 'Logs for BullMQ queue job processing (email, charge, notification)';

-- Grant permissions
GRANT SELECT ON public.queue_logs TO authenticated;
GRANT ALL ON public.queue_logs TO service_role;

-- Optional: Create a function to clean old logs (run as cron job)
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete completed logs older than 30 days
    DELETE FROM public.queue_logs
    WHERE status = 'completed'
    AND processed_at < NOW() - INTERVAL '30 days';

    -- Delete failed logs older than 90 days
    DELETE FROM public.queue_logs
    WHERE status = 'failed'
    AND processed_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_queue_logs() TO service_role;

-- Add comment to function
COMMENT ON FUNCTION public.cleanup_old_queue_logs() IS 'Cleans up old queue logs: completed (30 days), failed (90 days)';
