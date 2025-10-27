-- Tabela de perfis de crédito
CREATE TABLE IF NOT EXISTS public.credit_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cpf VARCHAR(14) NOT NULL,
    analysis_type VARCHAR(20) CHECK (analysis_type IN ('free', 'detailed')),
    source VARCHAR(20) CHECK (source IN ('gov', 'assertiva')),
    data JSONB,
    score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cpf, company_id)
);

-- Tabela de triggers de análise
CREATE TABLE IF NOT EXISTS public.analysis_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    trigger_scope VARCHAR(20) CHECK (trigger_scope IN ('single', 'group', 'all')),
    users UUID[],
    analysis_type VARCHAR(20) CHECK (analysis_type IN ('free', 'detailed')),
    status VARCHAR(20) CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    total_users INT DEFAULT 0,
    processed_users INT DEFAULT 0
);

-- Tabela de logs de análise
CREATE TABLE IF NOT EXISTS public.analysis_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_id UUID REFERENCES public.analysis_triggers(id) ON DELETE CASCADE,
    cpf VARCHAR(14) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_credit_profiles_company ON public.credit_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_profiles_cpf ON public.credit_profiles(cpf);
CREATE INDEX IF NOT EXISTS idx_analysis_triggers_company ON public.analysis_triggers(company_id);
CREATE INDEX IF NOT EXISTS idx_analysis_triggers_status ON public.analysis_triggers(status);
CREATE INDEX IF NOT EXISTS idx_analysis_logs_trigger ON public.analysis_logs(trigger_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_credit_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_credit_profiles_updated_at ON public.credit_profiles;
CREATE TRIGGER trigger_update_credit_profiles_updated_at
    BEFORE UPDATE ON public.credit_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_profiles_updated_at();

COMMENT ON TABLE public.credit_profiles IS 'Perfis de crédito dos clientes com análises';
COMMENT ON TABLE public.analysis_triggers IS 'Triggers de análise de crédito em lote';
COMMENT ON TABLE public.analysis_logs IS 'Logs de execução das análises';
