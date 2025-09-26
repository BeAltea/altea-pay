-- Popular banco com empresas fictícias e dados mock para demonstração
-- Este script cria empresas fictícias e atualiza dados existentes

-- 1. Inserir empresas fictícias
INSERT INTO public.companies (id, name, document, email, phone, address, city, state, zip_code) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'Enel Distribuição São Paulo',
    '61695227000193',
    'contato@enel.com.br',
    '(11) 0800-727-0196',
    'Rua Ática, 673',
    'São Paulo',
    'SP',
    '04634-042'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Sabesp - Companhia de Saneamento Básico',
    '43776517000176',
    'atendimento@sabesp.com.br',
    '(11) 0800-055-0195',
    'Rua Costa Carvalho, 300',
    'São Paulo',
    'SP',
    '05429-900'
),
(
    '33333333-3333-3333-3333-333333333333',
    'CPFL Energia',
    '02998611000104',
    'relacionamento@cpfl.com.br',
    '(19) 0800-010-1010',
    'Rod. Eng. Miguel Melhado Campos, 1632',
    'Campinas',
    'SP',
    '13088-900'
),
(
    '44444444-4444-4444-4444-444444444444',
    'Cemig Distribuição',
    '17155730000164',
    'atendimento@cemig.com.br',
    '(31) 0800-721-0116',
    'Av. Barbacena, 1200',
    'Belo Horizonte',
    'MG',
    '30190-131'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Criar usuários fictícios para cada empresa
-- Primeiro, vamos criar usuários admin para cada empresa
-- Nota: Estes usuários precisarão ser criados via auth.users também

-- Atualizar profiles existentes para distribuir entre empresas
-- Assumindo que já existem alguns profiles, vamos atribuí-los às empresas

-- Criar perfis de admin para cada empresa (se não existirem)
INSERT INTO public.profiles (id, email, full_name, role, company_id, company_name, phone) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'admin.enel@altea.com.br',
    'Administrador Enel',
    'admin',
    '11111111-1111-1111-1111-111111111111',
    'Enel Distribuição São Paulo',
    '(11) 99999-0001'
),
(
    '10000000-0000-0000-0000-000000000002',
    'admin.sabesp@altea.com.br',
    'Administrador Sabesp',
    'admin',
    '22222222-2222-2222-2222-222222222222',
    'Sabesp - Companhia de Saneamento Básico',
    '(11) 99999-0002'
),
(
    '10000000-0000-0000-0000-000000000003',
    'admin.cpfl@altea.com.br',
    'Administrador CPFL',
    'admin',
    '33333333-3333-3333-3333-333333333333',
    'CPFL Energia',
    '(19) 99999-0003'
),
(
    '10000000-0000-0000-0000-000000000004',
    'admin.cemig@altea.com.br',
    'Administrador Cemig',
    'admin',
    '44444444-4444-4444-4444-444444444444',
    'Cemig Distribuição',
    '(31) 99999-0004'
),
-- Super Admin da Altea (sem company_id)
(
    '10000000-0000-0000-0000-000000000000',
    'superadmin@altea.com.br',
    'Super Administrador Altea',
    'super_admin',
    NULL,
    'Altea Pay',
    '(11) 99999-0000'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Criar clientes fictícios para cada empresa
INSERT INTO public.customers (id, user_id, company_id, name, email, phone, document, document_type, address, city, state, zip_code) VALUES
-- Clientes da Enel
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'João Silva Santos',
    'joao.silva@email.com',
    '(11) 98765-4321',
    '12345678901',
    'CPF',
    'Rua das Flores, 123',
    'São Paulo',
    'SP',
    '01234-567'
),
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'Maria Oliveira Costa',
    'maria.oliveira@email.com',
    '(11) 97654-3210',
    '98765432109',
    'CPF',
    'Av. Paulista, 456',
    'São Paulo',
    'SP',
    '01310-100'
),
-- Clientes da Sabesp
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'Carlos Eduardo Lima',
    'carlos.lima@email.com',
    '(11) 96543-2109',
    '11122233344',
    'CPF',
    'Rua Augusta, 789',
    'São Paulo',
    'SP',
    '01305-000'
),
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    'Ana Paula Ferreira',
    'ana.ferreira@email.com',
    '(11) 95432-1098',
    '55566677788',
    'CPF',
    'Rua Oscar Freire, 321',
    'São Paulo',
    'SP',
    '01426-001'
),
-- Clientes da CPFL
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000003',
    '33333333-3333-3333-3333-333333333333',
    'Roberto Almeida',
    'roberto.almeida@email.com',
    '(19) 94321-0987',
    '99988877766',
    'CPF',
    'Av. das Amoreiras, 654',
    'Campinas',
    'SP',
    '13025-000'
),
-- Clientes da Cemig
(
    gen_random_uuid(),
    '10000000-0000-0000-0000-000000000004',
    '44444444-4444-4444-4444-444444444444',
    'Fernanda Santos',
    'fernanda.santos@email.com',
    '(31) 93210-9876',
    '44455566677',
    'CPF',
    'Rua da Bahia, 987',
    'Belo Horizonte',
    'MG',
    '30112-000'
);

-- 4. Atualizar dados existentes para incluir company_id
-- Se existirem dados sem company_id, vamos distribuí-los entre as empresas

-- Atualizar customers existentes (distribuir aleatoriamente entre empresas)
UPDATE public.customers 
SET company_id = (
    CASE 
        WHEN random() < 0.25 THEN '11111111-1111-1111-1111-111111111111'
        WHEN random() < 0.5 THEN '22222222-2222-2222-2222-222222222222'
        WHEN random() < 0.75 THEN '33333333-3333-3333-3333-333333333333'
        ELSE '44444444-4444-4444-4444-444444444444'
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

-- Atualizar collection_rules existentes (distribuir entre empresas)
UPDATE public.collection_rules 
SET company_id = profiles.company_id
FROM public.profiles 
WHERE collection_rules.user_id = profiles.id 
AND collection_rules.company_id IS NULL;

-- Atualizar collection_actions existentes baseado na debt
UPDATE public.collection_actions 
SET company_id = debts.company_id
FROM public.debts 
WHERE collection_actions.debt_id = debts.id 
AND collection_actions.company_id IS NULL;

-- Atualizar data_imports existentes (distribuir entre empresas)
UPDATE public.data_imports 
SET company_id = profiles.company_id
FROM public.profiles 
WHERE data_imports.user_id = profiles.id 
AND data_imports.company_id IS NULL;

-- 5. Criar algumas dívidas fictícias para demonstração
DO $$
DECLARE
    customer_record RECORD;
    debt_id UUID;
BEGIN
    -- Para cada cliente, criar algumas dívidas
    FOR customer_record IN 
        SELECT id, user_id, company_id, name 
        FROM public.customers 
        WHERE company_id IS NOT NULL
        LIMIT 20
    LOOP
        -- Criar 2-4 dívidas por cliente
        FOR i IN 1..(1 + floor(random() * 3)::int) LOOP
            debt_id := gen_random_uuid();
            
            INSERT INTO public.debts (
                id, 
                customer_id, 
                user_id, 
                company_id,
                description, 
                amount, 
                due_date, 
                status, 
                classification,
                propensity_payment_score,
                propensity_loan_score
            ) VALUES (
                debt_id,
                customer_record.id,
                customer_record.user_id,
                customer_record.company_id,
                CASE 
                    WHEN customer_record.company_id = '11111111-1111-1111-1111-111111111111' THEN 'Conta de Energia Elétrica - ' || to_char(current_date - interval '1 month' * i, 'MM/YYYY')
                    WHEN customer_record.company_id = '22222222-2222-2222-2222-222222222222' THEN 'Conta de Água e Esgoto - ' || to_char(current_date - interval '1 month' * i, 'MM/YYYY')
                    WHEN customer_record.company_id = '33333333-3333-3333-3333-333333333333' THEN 'Conta de Energia CPFL - ' || to_char(current_date - interval '1 month' * i, 'MM/YYYY')
                    ELSE 'Conta de Energia Cemig - ' || to_char(current_date - interval '1 month' * i, 'MM/YYYY')
                END,
                (50 + random() * 950)::numeric(10,2), -- Valor entre R$ 50 e R$ 1000
                current_date - interval '1 month' * i + interval '15 days', -- Vencimento
                CASE 
                    WHEN random() < 0.3 THEN 'paid'
                    WHEN random() < 0.7 THEN 'overdue'
                    ELSE 'pending'
                END,
                CASE 
                    WHEN random() < 0.2 THEN 'high_risk'
                    WHEN random() < 0.6 THEN 'medium_risk'
                    ELSE 'low_risk'
                END,
                (20 + random() * 80)::numeric(5,2), -- Score de pagamento entre 20 e 100
                (10 + random() * 90)::numeric(5,2)  -- Score de empréstimo entre 10 e 100
            );
        END LOOP;
    END LOOP;
END $$;

-- Verificar se os dados foram criados corretamente
SELECT 
    c.name as company_name,
    COUNT(DISTINCT p.id) as admins,
    COUNT(DISTINCT cu.id) as customers,
    COUNT(DISTINCT d.id) as debts,
    COALESCE(SUM(d.amount), 0) as total_amount
FROM public.companies c
LEFT JOIN public.profiles p ON c.id = p.company_id AND p.role = 'admin'
LEFT JOIN public.customers cu ON c.id = cu.company_id
LEFT JOIN public.debts d ON c.id = d.company_id
GROUP BY c.id, c.name
ORDER BY c.name;

SELECT 'Mock companies and data populated successfully!' as status;
