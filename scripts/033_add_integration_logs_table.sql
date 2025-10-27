-- Tabela de logs de integração com APIs externas
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    cpf VARCHAR(14),
    operation VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('success', 'failed')) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_integration_logs_company ON public.integration_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_cpf ON public.integration_logs(cpf);
CREATE INDEX IF NOT EXISTS idx_integration_logs_operation ON public.integration_logs(operation);
CREATE INDEX IF NOT EXISTS idx_integration_logs_created_at ON public.integration_logs(created_at DESC);

COMMENT ON TABLE public.integration_logs IS 'Logs de integração com APIs externas (Assertiva, etc)';
