-- Popular banco com empresas fictícias para demonstração
-- Este script cria apenas empresas e dados básicos, sem profiles de usuários

-- 1. Inserir empresas fictícias
INSERT INTO public.companies (id, name, cnpj, email, phone, address, city, state, zip_code, sector) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Enel Distribuição São Paulo',
    '61.695.227/0001-93',
    'contato@enel.com.br',
    '(11) 0800-727-0196',
    'Rua Ática, 673',
    'São Paulo',
    'SP',
    '04634-042',
    'Energia Elétrica'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Sabesp - Companhia de Saneamento Básico',
    '43.776.517/0001-76',
    'atendimento@sabesp.com.br',
    '(11) 0800-055-0195',
    'Rua Costa Carvalho, 300',
    'São Paulo',
    'SP',
    '05429-900',
    'Saneamento'
),
(
    '33333333-3333-3333-3333-333333333333',
    'CPFL Energia',
    '02.998.611/0001-04',
    'relacionamento@cpfl.com.br',
    '(19) 0800-010-1010',
    'Rod. Eng. Miguel Melhado Campos, 1632',
    'Campinas',
    'SP',
    '13088-900',
    'Energia Elétrica'
),
(
    '44444444-4444-4444-4444-444444444444',
    'Cemig Distribuição',
    '17.155.730/0001-64',
    'atendimento@cemig.com.br',
    '(31) 0800-721-0116',
    'Av. Barbacena, 1200',
    'Belo Horizonte',
    'MG',
    '30190-131',
    'Energia Elétrica'
),
(
    '55555555-5555-5555-5555-555555555555',
    'Copasa - Companhia de Saneamento de Minas Gerais',
    '17.281.106/0001-03',
    'atendimento@copasa.com.br',
    '(31) 0800-031-0195',
    'Rua Mar de Espanha, 525',
    'Belo Horizonte',
    'MG',
    '30170-110',
    'Saneamento'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Atualizar dados existentes para incluir company_id
-- Se existirem dados sem company_id, vamos distribuí-los entre as empresas

-- Adicionando cast ::uuid para converter strings em UUIDs
-- Atualizar customers existentes (distribuir aleatoriamente entre empresas)
UPDATE public.customers 
SET company_id = (
    CASE 
        WHEN random() < 0.2 THEN '11111111-1111-1111-1111-111111111111'::uuid
        WHEN random() < 0.4 THEN '22222222-2222-2222-2222-222222222222'::uuid
        WHEN random() < 0.6 THEN '33333333-3333-3333-3333-333333333333'::uuid
        WHEN random() < 0.8 THEN '44444444-4444-4444-4444-444444444444'::uuid
        ELSE '55555555-5555-5555-5555-555555555555'::uuid
    END
)
WHERE company_id IS NULL;

-- Atualizar debts existentes baseado no customer
UPDATE public.debts 
SET company_id = customers.company_id
FROM public.customers 
WHERE debts.customer_id = customers.id 
AND debts.company_id IS NULL;

-- Atualizar agreements existentes baseado na debt
UPDATE public.agreements 
SET company_id = debts.company_id
FROM public.debts 
WHERE agreements.debt_id = debts.id 
AND agreements.company_id IS NULL;

-- Atualizar payments existentes baseado na debt
UPDATE public.payments 
SET company_id = debts.company_id
FROM public.debts 
WHERE payments.debt_id = debts.id 
AND payments.company_id IS NULL;

-- Atualizar outras tabelas se existirem
DO $$
BEGIN
    -- collection_rules
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collection_rules') THEN
        UPDATE public.collection_rules 
        SET company_id = profiles.company_id
        FROM public.profiles 
        WHERE collection_rules.user_id = profiles.id 
        AND collection_rules.company_id IS NULL;
    END IF;
    
    -- collection_actions
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'collection_actions') THEN
        UPDATE public.collection_actions 
        SET company_id = debts.company_id
        FROM public.debts 
        WHERE collection_actions.debt_id = debts.id 
        AND collection_actions.company_id IS NULL;
    END IF;
    
    -- data_imports
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'data_imports') THEN
        UPDATE public.data_imports 
        SET company_id = profiles.company_id
        FROM public.profiles 
        WHERE data_imports.user_id = profiles.id 
        AND data_imports.company_id IS NULL;
    END IF;
END $$;

-- Verificar se os dados foram criados corretamente
SELECT 
    c.name as company_name,
    c.sector,
    COUNT(DISTINCT cu.id) as customers,
    COUNT(DISTINCT d.id) as debts,
    COALESCE(SUM(d.amount), 0) as total_amount
FROM public.companies c
LEFT JOIN public.customers cu ON c.id = cu.company_id
LEFT JOIN public.debts d ON c.id = d.company_id
GROUP BY c.id, c.name, c.sector
ORDER BY c.name;

SELECT 'Mock companies populated successfully! Users will be created when they sign up.' as status;
