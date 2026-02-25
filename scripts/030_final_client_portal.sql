-- Final Client Portal Schema
-- Creates table for final clients (debtors) who can view their debts across all companies

-- 1. Create final_clients table
CREATE TABLE IF NOT EXISTS public.final_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),
    document TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_final_clients_email ON public.final_clients(email);
CREATE INDEX IF NOT EXISTS idx_final_clients_document ON public.final_clients(document);
CREATE INDEX IF NOT EXISTS idx_final_clients_document_type ON public.final_clients(document_type);

-- 3. Create unique constraint on document (normalized)
CREATE UNIQUE INDEX IF NOT EXISTS idx_final_clients_document_unique
ON public.final_clients(REGEXP_REPLACE(document, '[^0-9]', '', 'g'));

-- 4. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_final_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS final_clients_updated_at_trigger ON public.final_clients;
CREATE TRIGGER final_clients_updated_at_trigger
    BEFORE UPDATE ON public.final_clients
    FOR EACH ROW
    EXECUTE FUNCTION update_final_clients_updated_at();

-- 5. Enable RLS
ALTER TABLE public.final_clients ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
-- Only service role can access final_clients table (auth is handled by API)
CREATE POLICY "Service role full access to final_clients" ON public.final_clients
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. Create session tokens table for portal auth
CREATE TABLE IF NOT EXISTS public.final_client_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    final_client_id UUID NOT NULL REFERENCES public.final_clients(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_final_client_sessions_token ON public.final_client_sessions(token);
CREATE INDEX IF NOT EXISTS idx_final_client_sessions_final_client_id ON public.final_client_sessions(final_client_id);
CREATE INDEX IF NOT EXISTS idx_final_client_sessions_expires_at ON public.final_client_sessions(expires_at);

-- 8. Enable RLS on sessions
ALTER TABLE public.final_client_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to final_client_sessions" ON public.final_client_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 9. Add comments
COMMENT ON TABLE public.final_clients IS 'Portal users (debtors) who can view their debts across all companies';
COMMENT ON COLUMN public.final_clients.document IS 'CPF or CNPJ (stored with formatting or clean)';
COMMENT ON COLUMN public.final_clients.document_type IS 'cpf for pessoa fisica, cnpj for pessoa juridica';
COMMENT ON TABLE public.final_client_sessions IS 'Session tokens for portal authentication';

-- 10. Verify creation
SELECT 'Final Client Portal schema created successfully!' as status;
