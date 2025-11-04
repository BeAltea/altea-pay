-- Garantir que a tabela integration_logs está correta
-- Drop e recriar para garantir que o schema está atualizado

DROP TABLE IF EXISTS public.integration_logs CASCADE;

CREATE TABLE public.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    cpf VARCHAR(14),
    operation VARCHAR(50) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('success', 'failed')) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_integration_logs_company ON public.integration_logs(company_id);
CREATE INDEX idx_integration_logs_cpf ON public.integration_logs(cpf);
CREATE INDEX idx_integration_logs_operation ON public.integration_logs(operation);
CREATE INDEX idx_integration_logs_created_at ON public.integration_logs(created_at DESC);

-- Comentário
COMMENT ON TABLE public.integration_logs IS 'Logs de integração com APIs externas (Assertiva, Portal da Transparência, etc)';
COMMENT ON COLUMN public.integration_logs.details IS 'Detalhes da operação em formato JSON';
