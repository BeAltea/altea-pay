-- Script para popular dados fictícios para as 3 contas de demonstração
-- admin@admin.com, admin@bealtea.com e cliente@cliente.com

DO $$
DECLARE
  admin_company_id UUID;
  bealtea_company_id UUID;
  admin_user_id UUID := '49202cca-7a91-402f-8ed2-cfb93a3f298e';
  bealtea_user_id UUID := '54a3079d-8f11-4bc6-9be2-91fe3f7b2dcf';
  cliente_user_id UUID := '67b91e93-6aea-4efa-a5e5-cdc916f7d2b7';
BEGIN
  -- Criar empresas
  INSERT INTO companies (name, cnpj, email, phone, address, city, state, zip_code, sector, created_at, updated_at)
  VALUES (
    'Empresa Demo Admin',
    '12.345.678/0001-90',
    'contato@empresademo.com',
    '(11) 98765-4321',
    'Rua Demo, 123',
    'São Paulo',
    'SP',
    '01234-567',
    'Tecnologia',
    NOW(),
    NOW()
  )
  ON CONFLICT (cnpj) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO admin_company_id;

  INSERT INTO companies (name, cnpj, email, phone, address, city, state, zip_code, sector, created_at, updated_at)
  VALUES (
    'Bealtea Tecnologia',
    '98.765.432/0001-10',
    'contato@bealtea.com',
    '(11) 91234-5678',
    'Av. Paulista, 1000',
    'São Paulo',
    'SP',
    '01310-100',
    'Tecnologia',
    NOW(),
    NOW()
  )
  ON CONFLICT (cnpj) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO bealtea_company_id;

  -- Atualizar perfis com company_id
  UPDATE profiles SET company_id = admin_company_id WHERE id = admin_user_id;
  UPDATE profiles SET company_id = bealtea_company_id WHERE id = bealtea_user_id;
  UPDATE profiles SET company_id = admin_company_id WHERE id = cliente_user_id;

  -- Adicionando document_type obrigatório
  -- Popular clientes para Empresa Demo Admin
  INSERT INTO customers (company_id, name, email, phone, document, document_type, address, city, state, zip_code, created_at, updated_at)
  VALUES
    (admin_company_id, 'João Silva', 'joao.silva@email.com', '(11) 98765-1111', '123.456.789-00', 'CPF', 'Rua A, 100', 'São Paulo', 'SP', '01000-000', NOW(), NOW()),
    (admin_company_id, 'Maria Santos', 'maria.santos@email.com', '(11) 98765-2222', '234.567.890-11', 'CPF', 'Rua B, 200', 'São Paulo', 'SP', '02000-000', NOW(), NOW()),
    (admin_company_id, 'Pedro Oliveira', 'pedro.oliveira@email.com', '(11) 98765-3333', '345.678.901-22', 'CPF', 'Rua C, 300', 'São Paulo', 'SP', '03000-000', NOW(), NOW()),
    (admin_company_id, 'Ana Costa', 'ana.costa@email.com', '(11) 98765-4444', '456.789.012-33', 'CPF', 'Rua D, 400', 'São Paulo', 'SP', '04000-000', NOW(), NOW()),
    (admin_company_id, 'Carlos Ferreira', 'carlos.ferreira@email.com', '(11) 98765-5555', '567.890.123-44', 'CPF', 'Rua E, 500', 'São Paulo', 'SP', '05000-000', NOW(), NOW());

  -- Popular clientes para Bealtea Tecnologia
  INSERT INTO customers (company_id, name, email, phone, document, document_type, address, city, state, zip_code, created_at, updated_at)
  VALUES
    (bealtea_company_id, 'Roberto Lima', 'roberto.lima@email.com', '(11) 97654-1111', '678.901.234-55', 'CPF', 'Av. X, 1000', 'São Paulo', 'SP', '06000-000', NOW(), NOW()),
    (bealtea_company_id, 'Juliana Souza', 'juliana.souza@email.com', '(11) 97654-2222', '789.012.345-66', 'CPF', 'Av. Y, 2000', 'São Paulo', 'SP', '07000-000', NOW(), NOW()),
    (bealtea_company_id, 'Fernando Alves', 'fernando.alves@email.com', '(11) 97654-3333', '890.123.456-77', 'CPF', 'Av. Z, 3000', 'São Paulo', 'SP', '08000-000', NOW(), NOW());

  -- Usando colunas corretas do schema: company_id ao invés de user_id, amount ao invés de original_amount/current_amount
  -- Popular dívidas
  INSERT INTO debts (company_id, customer_id, amount, due_date, status, classification, description, created_at, updated_at)
  SELECT 
    admin_company_id,
    c.id,
    CASE ROW_NUMBER() OVER()
      WHEN 1 THEN 1500.00
      WHEN 2 THEN 3200.00
      WHEN 3 THEN 850.00
      WHEN 4 THEN 5400.00
      ELSE 2100.00
    END,
    NOW() - INTERVAL '1 day' * (ROW_NUMBER() OVER() * 15),
    CASE 
      WHEN ROW_NUMBER() OVER() <= 2 THEN 'pending'
      WHEN ROW_NUMBER() OVER() = 3 THEN 'in_negotiation'
      ELSE 'pending'
    END,
    CASE 
      WHEN ROW_NUMBER() OVER() * 15 <= 30 THEN 'low'
      WHEN ROW_NUMBER() OVER() * 15 <= 60 THEN 'medium'
      ELSE 'high'
    END,
    'Dívida de contrato ' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
    NOW(),
    NOW()
  FROM customers c
  WHERE c.company_id = admin_company_id
  LIMIT 5;

  -- Usando colunas corretas: original_amount, agreed_amount, discount_amount
  -- Popular acordos
  INSERT INTO agreements (debt_id, customer_id, company_id, user_id, original_amount, agreed_amount, discount_amount, installments, due_date, status, terms, created_at, updated_at)
  SELECT 
    d.id,
    d.customer_id,
    d.company_id,
    cliente_user_id,
    d.amount,
    d.amount * 0.85,
    d.amount * 0.15,
    6,
    NOW() + INTERVAL '7 days',
    'active',
    'Acordo de 6 parcelas com 15% de desconto',
    NOW(),
    NOW()
  FROM debts d
  WHERE d.company_id = admin_company_id AND d.status = 'in_negotiation'
  LIMIT 1;

  -- Popular histórico de cobranças
  INSERT INTO collection_actions (debt_id, user_id, action_type, status, scheduled_for, executed_at, message, created_at)
  SELECT 
    d.id,
    cliente_user_id,
    CASE (ROW_NUMBER() OVER()) % 3
      WHEN 0 THEN 'email'
      WHEN 1 THEN 'sms'
      ELSE 'whatsapp'
    END,
    'sent',
    NOW() - INTERVAL '1 day' * (ROW_NUMBER() OVER()),
    NOW() - INTERVAL '1 day' * (ROW_NUMBER() OVER()),
    'Cobrança automática enviada',
    NOW() - INTERVAL '1 day' * (ROW_NUMBER() OVER())
  FROM debts d
  WHERE d.company_id = admin_company_id
  LIMIT 10;

  RAISE NOTICE 'Dados fictícios criados com sucesso!';
  RAISE NOTICE 'admin@admin.com - Company: %', admin_company_id;
  RAISE NOTICE 'admin@bealtea.com - Company: %', bealtea_company_id;
END $$;
