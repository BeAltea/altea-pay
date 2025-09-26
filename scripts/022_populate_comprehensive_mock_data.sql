-- Script abrangente para popular banco com dados fictícios multi-empresa
-- Este script cria um conjunto completo de dados para demonstração

-- 1. Limpar dados existentes (opcional - descomente se necessário)
-- DELETE FROM public.payments WHERE company_id IS NOT NULL;
-- DELETE FROM public.agreements WHERE company_id IS NOT NULL;
-- DELETE FROM public.debts WHERE company_id IS NOT NULL;
-- DELETE FROM public.customers WHERE company_id IS NOT NULL;
-- DELETE FROM public.profiles WHERE company_id IS NOT NULL OR role = 'super_admin';
-- DELETE FROM public.companies;

-- 2. Inserir empresas fictícias (garantir que existam)
-- Alterado 'document' para 'cnpj' para corresponder à estrutura da tabela
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
    'Rua Copacabana, 540',
    'Belo Horizonte',
    'MG',
    '30112-000',
    'Saneamento'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    cnpj = EXCLUDED.cnpj,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    zip_code = EXCLUDED.zip_code,
    sector = EXCLUDED.sector,
    updated_at = NOW();

-- 3. Criar perfis de usuários (Super Admin + Admins das empresas)
INSERT INTO public.profiles (id, email, full_name, role, company_id, company_name, phone) VALUES
-- Super Admin da Altea
(
    '10000000-0000-0000-0000-000000000000',
    'superadmin@altea.com.br',
    'Super Administrador Altea',
    'super_admin',
    NULL,
    'Altea Pay',
    '(11) 99999-0000'
),
-- Admins das empresas
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
(
    '10000000-0000-0000-0000-000000000005',
    'admin.copasa@altea.com.br',
    'Administrador Copasa',
    'admin',
    '55555555-5555-5555-5555-555555555555',
    'Copasa - Companhia de Saneamento de Minas Gerais',
    '(31) 99999-0005'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    company_name = EXCLUDED.company_name,
    phone = EXCLUDED.phone,
    updated_at = NOW();

-- 4. Criar clientes fictícios para cada empresa (mais realistas)
DO $$
DECLARE
    company_record RECORD;
    customer_names TEXT[] := ARRAY[
        'João Silva Santos', 'Maria Oliveira Costa', 'Carlos Eduardo Lima', 'Ana Paula Ferreira',
        'Roberto Almeida', 'Fernanda Santos', 'Pedro Henrique Souza', 'Juliana Martins',
        'Ricardo Pereira', 'Camila Rodrigues', 'Bruno Carvalho', 'Larissa Nascimento',
        'Felipe Barbosa', 'Gabriela Moreira', 'Lucas Fernandes', 'Beatriz Gomes',
        'Thiago Ribeiro', 'Amanda Silva', 'Diego Costa', 'Priscila Alves',
        'Gustavo Mendes', 'Vanessa Lima', 'Rodrigo Santos', 'Tatiana Oliveira',
        'Marcelo Araújo', 'Renata Cardoso', 'André Vieira', 'Patrícia Rocha'
    ];
    customer_emails TEXT[] := ARRAY[
        'joao.silva@email.com', 'maria.oliveira@email.com', 'carlos.lima@email.com', 'ana.ferreira@email.com',
        'roberto.almeida@email.com', 'fernanda.santos@email.com', 'pedro.souza@email.com', 'juliana.martins@email.com',
        'ricardo.pereira@email.com', 'camila.rodrigues@email.com', 'bruno.carvalho@email.com', 'larissa.nascimento@email.com',
        'felipe.barbosa@email.com', 'gabriela.moreira@email.com', 'lucas.fernandes@email.com', 'beatriz.gomes@email.com',
        'thiago.ribeiro@email.com', 'amanda.silva@email.com', 'diego.costa@email.com', 'priscila.alves@email.com',
        'gustavo.mendes@email.com', 'vanessa.lima@email.com', 'rodrigo.santos@email.com', 'tatiana.oliveira@email.com',
        'marcelo.araujo@email.com', 'renata.cardoso@email.com', 'andre.vieira@email.com', 'patricia.rocha@email.com'
    ];
    i INTEGER;
    customers_per_company INTEGER := 8;
    admin_user_id UUID;
BEGIN
    -- Para cada empresa, criar clientes
    FOR company_record IN 
        SELECT id, name FROM public.companies 
    LOOP
        -- Buscar o admin da empresa
        SELECT id INTO admin_user_id 
        FROM public.profiles 
        WHERE company_id = company_record.id AND role = 'admin' 
        LIMIT 1;
        
        -- Criar clientes para esta empresa
        FOR i IN 1..customers_per_company LOOP
            INSERT INTO public.customers (
                id, 
                user_id, 
                company_id, 
                name, 
                email, 
                phone, 
                document, 
                document_type, 
                address, 
                city, 
                state, 
                zip_code
            ) VALUES (
                gen_random_uuid(),
                admin_user_id,
                company_record.id,
                customer_names[((i-1) % array_length(customer_names, 1)) + 1],
                customer_emails[((i-1) % array_length(customer_emails, 1)) + 1],
                '(11) 9' || LPAD((9000 + i)::text, 4, '0') || '-' || LPAD((1000 + i)::text, 4, '0'),
                LPAD((10000000000 + i + (company_record.id::text::bigint % 1000000))::text, 11, '0'),
                'CPF',
                'Rua ' || (CASE 
                    WHEN i % 4 = 1 THEN 'das Flores'
                    WHEN i % 4 = 2 THEN 'Augusta'
                    WHEN i % 4 = 3 THEN 'Paulista'
                    ELSE 'Oscar Freire'
                END) || ', ' || (100 + i)::text,
                CASE 
                    WHEN company_record.id = '11111111-1111-1111-1111-111111111111' THEN 'São Paulo'
                    WHEN company_record.id = '22222222-2222-2222-2222-222222222222' THEN 'São Paulo'
                    WHEN company_record.id = '33333333-3333-3333-3333-333333333333' THEN 'Campinas'
                    ELSE 'Belo Horizonte'
                END,
                CASE 
                    WHEN company_record.id = '11111111-1111-1111-1111-111111111111' THEN 'SP'
                    WHEN company_record.id = '22222222-2222-2222-2222-222222222222' THEN 'SP'
                    WHEN company_record.id = '33333333-3333-3333-3333-333333333333' THEN 'SP'
                    ELSE 'MG'
                END,
                LPAD((10000 + i)::text, 5, '0') || '-' || LPAD((100 + i)::text, 3, '0')
            );
        END LOOP;
    END LOOP;
END $$;

-- 5. Criar dívidas realistas para cada cliente
DO $$
DECLARE
    customer_record RECORD;
    debt_id UUID;
    debt_descriptions TEXT[] := ARRAY[
        'Conta de Energia Elétrica', 'Conta de Água e Esgoto', 'Taxa de Iluminação Pública',
        'Multa por Atraso', 'Juros de Mora', 'Conta de Gás', 'Taxa de Esgoto',
        'Conta Residencial', 'Conta Comercial', 'Reajuste Tarifário'
    ];
    j INTEGER;
    debts_per_customer INTEGER;
    company_name TEXT;
BEGIN
    -- Para cada cliente, criar dívidas
    FOR customer_record IN 
        SELECT c.id, c.user_id, c.company_id, c.name, comp.name as company_name
        FROM public.customers c
        JOIN public.companies comp ON c.company_id = comp.id
        WHERE c.company_id IS NOT NULL
    LOOP
        -- Número aleatório de dívidas por cliente (1-5)
        debts_per_customer := 1 + floor(random() * 4)::int;
        
        FOR j IN 1..debts_per_customer LOOP
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
                propensity_loan_score,
                created_at
            ) VALUES (
                debt_id,
                customer_record.id,
                customer_record.user_id,
                customer_record.company_id,
                debt_descriptions[((j-1) % array_length(debt_descriptions, 1)) + 1] || ' - ' || 
                to_char(current_date - interval '1 month' * j, 'MM/YYYY'),
                -- Valores mais realistas baseados no tipo de empresa
                CASE 
                    WHEN customer_record.company_id = '11111111-1111-1111-1111-111111111111' THEN (80 + random() * 420)::numeric(10,2) -- Enel: R$ 80-500
                    WHEN customer_record.company_id = '22222222-2222-2222-2222-222222222222' THEN (45 + random() * 255)::numeric(10,2) -- Sabesp: R$ 45-300
                    WHEN customer_record.company_id = '33333333-3333-3333-3333-333333333333' THEN (90 + random() * 510)::numeric(10,2) -- CPFL: R$ 90-600
                    WHEN customer_record.company_id = '44444444-4444-4444-4444-444444444444' THEN (70 + random() * 330)::numeric(10,2) -- Cemig: R$ 70-400
                    ELSE (50 + random() * 200)::numeric(10,2) -- Copasa: R$ 50-250
                END,
                current_date - interval '1 month' * j + interval '15 days', -- Vencimento
                -- Status mais realista
                CASE 
                    WHEN random() < 0.15 THEN 'paid'
                    WHEN random() < 0.45 THEN 'overdue'
                    WHEN random() < 0.75 THEN 'pending'
                    WHEN random() < 0.90 THEN 'in_collection'
                    ELSE 'negotiated'
                END,
                -- Classificação baseada no valor e tempo
                CASE 
                    WHEN j <= 1 AND random() < 0.6 THEN 'low_risk'
                    WHEN j <= 2 AND random() < 0.4 THEN 'medium_risk'
                    WHEN j <= 3 THEN 'high_risk'
                    ELSE 'critical'
                END,
                -- Score de pagamento (mais alto para dívidas recentes)
                CASE 
                    WHEN j = 1 THEN (60 + random() * 35)::numeric(5,2) -- 60-95% para dívidas recentes
                    WHEN j <= 2 THEN (40 + random() * 45)::numeric(5,2) -- 40-85% para dívidas de 1-2 meses
                    WHEN j <= 3 THEN (25 + random() * 50)::numeric(5,2) -- 25-75% para dívidas de 2-3 meses
                    ELSE (10 + random() * 40)::numeric(5,2) -- 10-50% para dívidas antigas
                END,
                -- Score de empréstimo (inverso do pagamento)
                CASE 
                    WHEN j = 1 THEN (15 + random() * 25)::numeric(5,2) -- 15-40% para dívidas recentes
                    WHEN j <= 2 THEN (25 + random() * 35)::numeric(5,2) -- 25-60% para dívidas de 1-2 meses
                    WHEN j <= 3 THEN (40 + random() * 40)::numeric(5,2) -- 40-80% para dívidas de 2-3 meses
                    ELSE (60 + random() * 35)::numeric(5,2) -- 60-95% para dívidas antigas
                END,
                current_date - interval '1 month' * j -- Data de criação
            );
        END LOOP;
    END LOOP;
END $$;

-- 6. Criar alguns acordos e pagamentos para tornar os dados mais realistas
DO $$
DECLARE
    debt_record RECORD;
    agreement_id UUID;
    payment_id UUID;
BEGIN
    -- Criar acordos para algumas dívidas em negociação
    FOR debt_record IN 
        SELECT id, customer_id, user_id, company_id, amount 
        FROM public.debts 
        WHERE status IN ('negotiated', 'in_collection') 
        AND random() < 0.3 -- 30% das dívidas em negociação terão acordos
        LIMIT 20
    LOOP
        agreement_id := gen_random_uuid();
        
        INSERT INTO public.agreements (
            id,
            debt_id,
            customer_id,
            user_id,
            company_id,
            original_amount,
            agreed_amount,
            discount_percentage,
            installments,
            installment_amount,
            status,
            created_at
        ) VALUES (
            agreement_id,
            debt_record.id,
            debt_record.customer_id,
            debt_record.user_id,
            debt_record.company_id,
            debt_record.amount,
            debt_record.amount * (0.7 + random() * 0.25), -- Desconto de 5-30%
            (5 + random() * 25)::numeric(5,2), -- Desconto de 5-30%
            1 + floor(random() * 5)::int, -- 1-5 parcelas
            (debt_record.amount * (0.7 + random() * 0.25)) / (1 + floor(random() * 5)::int),
            CASE 
                WHEN random() < 0.6 THEN 'active'
                WHEN random() < 0.8 THEN 'completed'
                ELSE 'cancelled'
            END,
            current_date - interval '1 day' * floor(random() * 30)::int
        );
    END LOOP;
    
    -- Criar alguns pagamentos para dívidas pagas
    FOR debt_record IN 
        SELECT id, customer_id, user_id, company_id, amount 
        FROM public.debts 
        WHERE status = 'paid'
        LIMIT 15
    LOOP
        payment_id := gen_random_uuid();
        
        INSERT INTO public.payments (
            id,
            debt_id,
            customer_id,
            user_id,
            company_id,
            amount,
            payment_method,
            status,
            processed_at,
            created_at
        ) VALUES (
            payment_id,
            debt_record.id,
            debt_record.customer_id,
            debt_record.user_id,
            debt_record.company_id,
            debt_record.amount,
            CASE 
                WHEN random() < 0.4 THEN 'pix'
                WHEN random() < 0.7 THEN 'credit_card'
                WHEN random() < 0.9 THEN 'bank_slip'
                ELSE 'bank_transfer'
            END,
            'completed',
            current_date - interval '1 day' * floor(random() * 60)::int,
            current_date - interval '1 day' * floor(random() * 60)::int
        );
    END LOOP;
END $$;

-- 7. Atualizar dados existentes para garantir consistência
UPDATE public.customers 
SET company_id = (
    CASE 
        WHEN random() < 0.2 THEN '11111111-1111-1111-1111-111111111111'
        WHEN random() < 0.4 THEN '22222222-2222-2222-2222-222222222222'
        WHEN random() < 0.6 THEN '33333333-3333-3333-3333-333333333333'
        WHEN random() < 0.8 THEN '44444444-4444-4444-4444-444444444444'
        ELSE '55555555-5555-5555-5555-555555555555'
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

-- 8. Relatório final dos dados criados
SELECT 
    '=== RELATÓRIO DE DADOS CRIADOS ===' as title;

SELECT 
    c.name as "Empresa",
    COUNT(DISTINCT p.id) as "Admins",
    COUNT(DISTINCT cu.id) as "Clientes",
    COUNT(DISTINCT d.id) as "Dívidas",
    COUNT(DISTINCT a.id) as "Acordos",
    COUNT(DISTINCT pay.id) as "Pagamentos",
    COALESCE(SUM(d.amount), 0)::numeric(12,2) as "Valor Total (R$)",
    ROUND(AVG(d.propensity_payment_score), 2) as "Score Médio Pagamento",
    ROUND(AVG(d.propensity_loan_score), 2) as "Score Médio Empréstimo"
FROM public.companies c
LEFT JOIN public.profiles p ON c.id = p.company_id
LEFT JOIN public.customers cu ON c.id = cu.company_id
LEFT JOIN public.debts d ON c.id = d.company_id
LEFT JOIN public.agreements a ON c.id = a.company_id
LEFT JOIN public.payments pay ON c.id = pay.company_id
GROUP BY c.id, c.name
ORDER BY c.name;

-- Estatísticas gerais
SELECT 
    'ESTATÍSTICAS GERAIS' as categoria,
    COUNT(*) as total
FROM (
    SELECT 'Empresas' as tipo, COUNT(*) as total FROM public.companies
    UNION ALL
    SELECT 'Perfis', COUNT(*) FROM public.profiles WHERE company_id IS NOT NULL
    UNION ALL
    SELECT 'Clientes', COUNT(*) FROM public.customers WHERE company_id IS NOT NULL
    UNION ALL
    SELECT 'Dívidas', COUNT(*) FROM public.debts WHERE company_id IS NOT NULL
    UNION ALL
    SELECT 'Acordos', COUNT(*) FROM public.agreements WHERE company_id IS NOT NULL
    UNION ALL
    SELECT 'Pagamentos', COUNT(*) FROM public.payments WHERE company_id IS NOT NULL
) stats;

-- Status das dívidas por empresa
SELECT 
    c.name as "Empresa",
    d.status as "Status",
    COUNT(*) as "Quantidade",
    SUM(d.amount)::numeric(12,2) as "Valor Total (R$)"
FROM public.companies c
JOIN public.debts d ON c.id = d.company_id
GROUP BY c.name, d.status
ORDER BY c.name, d.status;

-- Clientes com maior propensão para microcrédito (score > 70% e dívida < R$ 1.000)
SELECT 
    c.name as "Empresa",
    cu.name as "Cliente",
    SUM(d.amount)::numeric(10,2) as "Dívida Total (R$)",
    ROUND(AVG(d.propensity_loan_score), 2) as "Score Empréstimo",
    CASE 
        WHEN AVG(d.propensity_loan_score) > 70 AND SUM(d.amount) < 1000 THEN 'ELEGÍVEL'
        ELSE 'NÃO ELEGÍVEL'
    END as "Status Microcrédito"
FROM public.companies c
JOIN public.customers cu ON c.id = cu.company_id
JOIN public.debts d ON cu.id = d.customer_id
WHERE d.status IN ('pending', 'overdue')
GROUP BY c.id, c.name, cu.id, cu.name
HAVING COUNT(d.id) > 0
ORDER BY AVG(d.propensity_loan_score) DESC, SUM(d.amount) ASC
LIMIT 20;

COMMIT;
