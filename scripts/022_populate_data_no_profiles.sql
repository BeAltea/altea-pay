-- Script 022: Popula dados completos SEM criar profiles
-- Os profiles serão criados quando os usuários fizerem signup na interface web

DO $$
DECLARE
    company_record RECORD;
    client_record RECORD;
    debt_record RECORD;
    payment_record RECORD;
    agreement_record RECORD;
    total_companies INTEGER := 0;
    total_clients INTEGER := 0;
    total_debts INTEGER := 0;
    total_payments INTEGER := 0;
    total_agreements INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando população de dados completos...';

    -- 1. Garantir que as empresas existem (já foram criadas no script 021)
    RAISE NOTICE 'Verificando empresas existentes...';
    SELECT COUNT(*) INTO total_companies FROM public.companies;
    RAISE NOTICE 'Empresas encontradas: %', total_companies;

    -- 2. Criar clientes para cada empresa (8 clientes por empresa)
    RAISE NOTICE 'Criando clientes para cada empresa...';
    
    FOR company_record IN SELECT id, name FROM public.companies LOOP
        RAISE NOTICE 'Criando clientes para empresa: %', company_record.name;
        
        -- Clientes para cada empresa com dados realistas
        INSERT INTO public.clients (
            id, name, email, phone, address, city, state, zip_code, 
            document_type, document_number, company_id, created_at, updated_at
        ) VALUES
        -- Empresa atual - 8 clientes
        (gen_random_uuid(), 'João Silva Santos', 'joao.silva@email.com', '(11) 98765-4321', 'Rua das Flores, 123', 'São Paulo', 'SP', '01234-567', 'CPF', '123.456.789-01', company_record.id, NOW(), NOW()),
        (gen_random_uuid(), 'Maria Oliveira Costa', 'maria.oliveira@email.com', '(11) 97654-3210', 'Av. Paulista, 456', 'São Paulo', 'SP', '01310-100', 'CPF', '234.567.890-12', company_record.id, NOW(), NOW()),
        (gen_random_uuid(), 'Pedro Almeida Lima', 'pedro.almeida@email.com', '(21) 96543-2109', 'Rua Copacabana, 789', 'Rio de Janeiro', 'RJ', '22070-011', 'CPF', '345.678.901-23', company_record.id, NOW(), NOW()),
        (gen_random_uuid(), 'Ana Carolina Ferreira', 'ana.ferreira@email.com', '(31) 95432-1098', 'Rua da Liberdade, 321', 'Belo Horizonte', 'MG', '30112-000', 'CPF', '456.789.012-34', company_record.id, NOW(), NOW()),
        (gen_random_uuid(), 'Carlos Eduardo Souza', 'carlos.souza@email.com', '(41) 94321-0987', 'Av. Batel, 654', 'Curitiba', 'PR', '80420-090', 'CPF', '567.890.123-45', company_record.id, NOW(), NOW()),
        (gen_random_uuid(), 'Fernanda Ribeiro Dias', 'fernanda.dias@email.com', '(51) 93210-9876', 'Rua Moinhos de Vento, 987', 'Porto Alegre', 'RS', '90570-001', 'CPF', '678.901.234-56', company_record.id, NOW(), NOW()),
        (gen_random_uuid(), 'Roberto Machado Silva', 'roberto.machado@email.com', '(85) 92109-8765', 'Av. Beira Mar, 147', 'Fortaleza', 'CE', '60165-121', 'CPF', '789.012.345-67', company_record.id, NOW(), NOW()),
        (gen_random_uuid(), 'Juliana Santos Pereira', 'juliana.pereira@email.com', '(71) 91098-7654', 'Rua do Pelourinho, 258', 'Salvador', 'BA', '40026-280', 'CPF', '890.123.456-78', company_record.id, NOW(), NOW())
        ON CONFLICT (document_number, company_id) DO NOTHING;
    END LOOP;

    -- Contar clientes criados
    SELECT COUNT(*) INTO total_clients FROM public.clients;
    RAISE NOTICE 'Total de clientes criados: %', total_clients;

    -- 3. Criar dívidas para cada cliente
    RAISE NOTICE 'Criando dívidas para os clientes...';
    
    FOR client_record IN SELECT id, name, company_id FROM public.clients LOOP
        -- Corrigindo para usar apenas colunas que existem na tabela debts
        -- Dívida 1 - Sempre criar uma dívida principal
        INSERT INTO public.debts (
            id, customer_id, company_id, amount, 
            due_date, status, description, classification, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), client_record.id, client_record.company_id, 
            (RANDOM() * 500 + 100)::DECIMAL(10,2),
            CURRENT_DATE - INTERVAL '30 days' + (RANDOM() * 180)::INTEGER * INTERVAL '1 day',
            CASE WHEN RANDOM() > 0.7 THEN 'paid' WHEN RANDOM() > 0.4 THEN 'in_negotiation' ELSE 'pending' END,
            'Conta de energia elétrica - ' || TO_CHAR(CURRENT_DATE - INTERVAL '60 days', 'MM/YYYY'),
            CASE WHEN RANDOM() > 0.7 THEN 'low' WHEN RANDOM() > 0.4 THEN 'medium' ELSE 'high' END,
            NOW(), NOW()
        );
        
        -- Dívida 2 - 50% chance de ter uma segunda dívida
        IF RANDOM() > 0.5 THEN
            INSERT INTO public.debts (
                id, customer_id, company_id, amount, 
                due_date, status, description, classification, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), client_record.id, client_record.company_id,
                (RANDOM() * 1500 + 500)::DECIMAL(10,2),
                CURRENT_DATE - INTERVAL '60 days' + (RANDOM() * 120)::INTEGER * INTERVAL '1 day',
                CASE WHEN RANDOM() > 0.6 THEN 'paid' WHEN RANDOM() > 0.3 THEN 'in_negotiation' ELSE 'pending' END,
                'Conta de água - ' || TO_CHAR(CURRENT_DATE - INTERVAL '90 days', 'MM/YYYY'),
                CASE WHEN RANDOM() > 0.6 THEN 'low' WHEN RANDOM() > 0.3 THEN 'medium' ELSE 'high' END,
                NOW(), NOW()
            );
        END IF;
        
        -- Dívida 3 - 30% chance de ter uma terceira dívida
        IF RANDOM() > 0.7 THEN
            INSERT INTO public.debts (
                id, customer_id, company_id, amount, 
                due_date, status, description, classification, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), client_record.id, client_record.company_id,
                (RANDOM() * 2000 + 1000)::DECIMAL(10,2),
                CURRENT_DATE - INTERVAL '90 days' + (RANDOM() * 90)::INTEGER * INTERVAL '1 day',
                CASE WHEN RANDOM() > 0.8 THEN 'paid' WHEN RANDOM() > 0.5 THEN 'in_negotiation' ELSE 'pending' END,
                'Conta de gás - ' || TO_CHAR(CURRENT_DATE - INTERVAL '120 days', 'MM/YYYY'),
                'critical',
                NOW(), NOW()
            );
        END IF;
    END LOOP;

    -- Limpar registros NULL que podem ter sido criados
    DELETE FROM public.debts WHERE id IS NULL;

    -- Contar dívidas criadas
    SELECT COUNT(*) INTO total_debts FROM public.debts;
    RAISE NOTICE 'Total de dívidas criadas: %', total_debts;

    -- 4. Criar alguns acordos para dívidas pendentes
    RAISE NOTICE 'Criando acordos para algumas dívidas...';
    
    FOR debt_record IN 
        SELECT id, customer_id, company_id, amount 
        FROM public.debts 
        WHERE status = 'pending' 
        AND RANDOM() > 0.7 -- 30% das dívidas pendentes terão acordos
        LIMIT 20
    LOOP
        -- Corrigindo para usar amount ao invés de current_amount
        INSERT INTO public.agreements (
            id, debt_id, customer_id, company_id, original_amount, agreed_amount,
            installments, due_date, status, created_at, updated_at
        ) VALUES (
            gen_random_uuid(), debt_record.id, debt_record.customer_id, debt_record.company_id,
            debt_record.amount,
            (debt_record.amount * (0.7 + RANDOM() * 0.2))::DECIMAL(10,2), -- 70-90% do valor original
            (3 + (RANDOM() * 9)::INTEGER), -- 3 a 12 parcelas
            CURRENT_DATE + INTERVAL '7 days',
            'active',
            NOW(), NOW()
        );
    END LOOP;

    -- Atualizar installment_amount nos acordos
    -- UPDATE public.agreements 
    -- SET installment_amount = (agreed_amount / installments)::DECIMAL(10,2)
    -- WHERE installment_amount = 0;

    -- Contar acordos criados
    SELECT COUNT(*) INTO total_agreements FROM public.agreements;
    RAISE NOTICE 'Total de acordos criados: %', total_agreements;

    -- 5. Criar alguns pagamentos para acordos ativos
    RAISE NOTICE 'Criando pagamentos para alguns acordos...';
    
    FOR agreement_record IN 
        SELECT id, customer_id, company_id, agreed_amount, installments 
        FROM public.agreements 
        WHERE status = 'active'
        AND RANDOM() > 0.6 -- 40% dos acordos terão pagamentos
        LIMIT 15
    LOOP
        -- Calculando installment_amount dinamicamente
        -- Criar 1-3 pagamentos por acordo
        FOR i IN 1..(1 + (RANDOM() * 2)::INTEGER) LOOP
            INSERT INTO public.payments (
                id, debt_id, customer_id, company_id, amount, payment_date,
                payment_method, status, created_at, updated_at
            ) VALUES (
                gen_random_uuid(), agreement_record.id, agreement_record.customer_id, 
                agreement_record.company_id, (agreement_record.agreed_amount / agreement_record.installments)::DECIMAL(10,2),
                CURRENT_DATE - (RANDOM() * 60)::INTEGER * INTERVAL '1 day',
                CASE 
                    WHEN RANDOM() > 0.7 THEN 'pix'
                    WHEN RANDOM() > 0.4 THEN 'bank_transfer'
                    WHEN RANDOM() > 0.2 THEN 'credit_card'
                    ELSE 'check'
                END,
                'confirmed',
                NOW(), NOW()
            );
        END LOOP;
    END LOOP;

    -- Contar pagamentos criados
    SELECT COUNT(*) INTO total_payments FROM public.payments;
    RAISE NOTICE 'Total de pagamentos criados: %', total_payments;

    -- 6. Relatório final
    RAISE NOTICE '=== RELATÓRIO FINAL ===';
    RAISE NOTICE 'Empresas: %', total_companies;
    RAISE NOTICE 'Clientes: %', total_clients;
    RAISE NOTICE 'Dívidas: %', total_debts;
    RAISE NOTICE 'Acordos: %', total_agreements;
    RAISE NOTICE 'Pagamentos: %', total_payments;
    RAISE NOTICE '======================';
    RAISE NOTICE 'População de dados concluída com sucesso!';
    RAISE NOTICE 'IMPORTANTE: Os usuários admin devem fazer signup através da interface web.';

END $$;
