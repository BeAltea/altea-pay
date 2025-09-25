-- Seed script para popular o sistema com dados fictícios para demonstração (CORRIGIDO)
-- Todos os dados são vinculados ao usuário existente com role = 'user'
-- CORREÇÃO: Usando valores de classificação em inglês conforme constraint da tabela
-- CORREÇÃO: Usando dados fictícios que não conflitam com usuários existentes

-- Primeiro, vamos identificar o usuário com role = 'user'
DO $$
DECLARE
    user_uuid UUID;
    customer_uuid UUID;
    debt_ids UUID[];
    payment_ids UUID[];
    agreement_ids UUID[];
BEGIN
    -- Buscar o usuário com role = 'user' (pedromourabarros9@gmail.com)
    SELECT id INTO user_uuid FROM profiles WHERE role = 'user' LIMIT 1;
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário com role = user encontrado';
    END IF;

    -- Criar um cliente fictício com dados que não conflitam com usuários existentes
    INSERT INTO customers (
        id, user_id, name, email, document, document_type, phone, 
        address, city, state, zip_code, created_at, updated_at
    ) VALUES (
        gen_random_uuid(), user_uuid, 'Maria Silva Santos', 'maria.silva@email.com', 
        '98765432100', 'CPF', '(11) 98888-7777',
        'Av. Paulista, 1000', 'São Paulo', 'SP', '01310-100',
        NOW() - INTERVAL '6 months', NOW()
    ) RETURNING id INTO customer_uuid;

    -- Criar 8 dívidas fictícias com diferentes status e valores
    -- Corrigindo valores de classification para inglês
    INSERT INTO debts (
        id, user_id, customer_id, description, amount, due_date, status, classification,
        created_at, updated_at
    ) VALUES 
    -- Dívida 1: Em aberto, baixo risco
    (gen_random_uuid(), user_uuid, customer_uuid, 'Fatura de Cartão de Crédito - Janeiro/2025', 
     850.00, '2025-01-15', 'pending', 'low', NOW() - INTERVAL '2 months', NOW()),
    
    -- Dívida 2: Em atraso, médio risco
    (gen_random_uuid(), user_uuid, customer_uuid, 'Financiamento Veículo - Parcela 12/24', 
     2450.00, '2024-12-10', 'pending', 'medium', NOW() - INTERVAL '4 months', NOW()),
    
    -- Dívida 3: Em cobrança, alto risco
    (gen_random_uuid(), user_uuid, customer_uuid, 'Empréstimo Pessoal - Parcela 8/12', 
     1200.00, '2024-11-20', 'in_negotiation', 'high', NOW() - INTERVAL '5 months', NOW()),
    
    -- Dívida 4: Paga
    (gen_random_uuid(), user_uuid, customer_uuid, 'Fatura de Cartão de Crédito - Dezembro/2024', 
     650.00, '2024-12-15', 'paid', 'low', NOW() - INTERVAL '3 months', NOW()),
    
    -- Dívida 5: Negociada
    (gen_random_uuid(), user_uuid, customer_uuid, 'Conta de Energia Elétrica - Novembro/2024', 
     320.00, '2024-11-30', 'in_negotiation', 'medium', NOW() - INTERVAL '3 months', NOW()),
    
    -- Dívida 6: Em aberto, crítico
    (gen_random_uuid(), user_uuid, customer_uuid, 'Financiamento Imóvel - Parcela 15/240', 
     4800.00, '2025-02-01', 'pending', 'critical', NOW() - INTERVAL '1 month', NOW()),
    
    -- Dívida 7: Em atraso, alto risco
    (gen_random_uuid(), user_uuid, customer_uuid, 'Cartão de Crédito - Fatura Anterior', 
     1850.00, '2024-10-25', 'pending', 'high', NOW() - INTERVAL '6 months', NOW()),
    
    -- Dívida 8: Paga
    (gen_random_uuid(), user_uuid, customer_uuid, 'Conta de Telefone - Outubro/2024', 
     180.00, '2024-10-15', 'paid', 'low', NOW() - INTERVAL '4 months', NOW());

    -- Buscar IDs das dívidas criadas para usar nas próximas inserções
    SELECT ARRAY(SELECT id FROM debts WHERE user_id = user_uuid ORDER BY created_at DESC LIMIT 8) INTO debt_ids;

    -- Criar histórico de pagamentos (para dívidas pagas e algumas parciais)
    -- Corrigindo payment_method para valores válidos
    INSERT INTO payments (
        id, user_id, debt_id, amount, payment_date, payment_method, status, 
        transaction_id, created_at, updated_at
    ) VALUES 
    -- Pagamentos das dívidas pagas
    (gen_random_uuid(), user_uuid, debt_ids[4], 650.00, '2024-12-18', 'pix', 'confirmed', 
     'PIX_' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
    
    (gen_random_uuid(), user_uuid, debt_ids[8], 180.00, '2024-10-20', 'bank_transfer', 'confirmed', 
     'BOL_' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
    
    -- Pagamentos parciais
    (gen_random_uuid(), user_uuid, debt_ids[2], 500.00, '2024-12-15', 'credit_card', 'confirmed', 
     'CARD_' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
    
    (gen_random_uuid(), user_uuid, debt_ids[3], 300.00, '2024-11-25', 'pix', 'confirmed', 
     'PIX_' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
    
    -- Pagamento pendente
    (gen_random_uuid(), user_uuid, debt_ids[1], 850.00, '2025-01-20', 'bank_transfer', 'pending', 
     'BOL_PENDING_' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW() - INTERVAL '5 days', NOW()),
    
    -- Pagamento que falhou
    (gen_random_uuid(), user_uuid, debt_ids[6], 1000.00, '2025-01-10', 'credit_card', 'failed', 
     'CARD_FAILED_' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW() - INTERVAL '10 days', NOW());

    -- Criar acordos/negociações
    -- Corrigindo status para valores válidos da tabela agreements
    INSERT INTO agreements (
        id, user_id, customer_id, debt_id, original_amount, agreed_amount, discount_amount,
        installments, due_date, status, terms, created_at, updated_at
    ) VALUES 
    -- Acordo aceito para dívida negociada
    (gen_random_uuid(), user_uuid, customer_uuid, debt_ids[5], 320.00, 250.00, 70.00,
     3, '2025-02-15', 'active', 'Pagamento em 3x de R$ 83,33 com desconto de 22%', 
     NOW() - INTERVAL '2 months', NOW() - INTERVAL '1 month'),
    
    -- Proposta pendente
    (gen_random_uuid(), user_uuid, customer_uuid, debt_ids[2], 2450.00, 1800.00, 650.00,
     6, '2025-03-01', 'active', 'Pagamento em 6x de R$ 300,00 com desconto de 27%', 
     NOW() - INTERVAL '1 week', NOW()),
    
    -- Contraproposta
    (gen_random_uuid(), user_uuid, customer_uuid, debt_ids[3], 1200.00, 900.00, 300.00,
     4, '2025-02-28', 'active', 'Cliente propôs 4x de R$ 225,00 com desconto de 25%', 
     NOW() - INTERVAL '3 days', NOW());

    -- Criar algumas ações de cobrança (histórico)
    -- Corrigindo status para valores válidos
    INSERT INTO collection_actions (
        id, user_id, debt_id, action_type, message, status, scheduled_for, executed_at, created_at
    ) VALUES 
    (gen_random_uuid(), user_uuid, debt_ids[2], 'email', 'Email de lembrete de vencimento enviado', 
     'sent', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks'),
    
    (gen_random_uuid(), user_uuid, debt_ids[3], 'sms', 'SMS de cobrança enviado', 
     'delivered', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
    
    (gen_random_uuid(), user_uuid, debt_ids[7], 'call', 'Ligação de cobrança realizada', 
     'sent', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    
    (gen_random_uuid(), user_uuid, debt_ids[1], 'email', 'Email de lembrete agendado', 
     'pending', NOW() + INTERVAL '2 days', NULL, NOW());

    RAISE NOTICE 'Dados fictícios criados com sucesso para o usuário: %', user_uuid;
    RAISE NOTICE 'Cliente criado: %', customer_uuid;
    RAISE NOTICE 'Total de dívidas criadas: %', array_length(debt_ids, 1);

END $$;

-- Atualizar estatísticas das tabelas
ANALYZE customers;
ANALYZE debts;
ANALYZE payments;
ANALYZE agreements;
ANALYZE collection_actions;
