-- Script para popular o banco com dados demo
-- Execute este script diretamente no Supabase SQL Editor

-- Tornando user_id nullable nas tabelas customers e debts para permitir dados demo
ALTER TABLE customers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE debts ALTER COLUMN user_id DROP NOT NULL;

-- Substituindo IDs de texto por UUIDs válidos
-- UUIDs fixos para facilitar referências
-- Sabesp: 11111111-1111-1111-1111-111111111111
-- Enel: 22222222-2222-2222-2222-222222222222
-- ProvedorX: 33333333-3333-3333-3333-333333333333

-- Limpar dados existentes (opcional - comente se não quiser limpar)
DELETE FROM debts WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');
DELETE FROM customers WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');
DELETE FROM companies WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');

-- Criar 3 empresas demo
INSERT INTO companies (id, name, cnpj, email, phone, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Sabesp - Saneamento Básico', '43.776.517/0001-80', 'contato@sabesp.com.br', '(11) 3388-8000', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Enel Distribuição SP', '61.695.227/0001-93', 'contato@enel.com.br', '(11) 3465-2000', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'ProvedorX Internet', '12.345.678/0001-90', 'contato@provedorx.com.br', '(11) 9999-0000', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  cnpj = EXCLUDED.cnpj,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  updated_at = NOW();

-- Função para gerar CPF válido
CREATE OR REPLACE FUNCTION generate_cpf() RETURNS TEXT AS $$
DECLARE
  n1 INT := floor(random() * 10);
  n2 INT := floor(random() * 10);
  n3 INT := floor(random() * 10);
  n4 INT := floor(random() * 10);
  n5 INT := floor(random() * 10);
  n6 INT := floor(random() * 10);
  n7 INT := floor(random() * 10);
  n8 INT := floor(random() * 10);
  n9 INT := floor(random() * 10);
  d1 INT;
  d2 INT;
  sum INT;
BEGIN
  -- Calcular primeiro dígito verificador
  sum := (n1 * 10) + (n2 * 9) + (n3 * 8) + (n4 * 7) + (n5 * 6) + (n6 * 5) + (n7 * 4) + (n8 * 3) + (n9 * 2);
  d1 := 11 - (sum % 11);
  IF d1 >= 10 THEN d1 := 0; END IF;
  
  -- Calcular segundo dígito verificador
  sum := (n1 * 11) + (n2 * 10) + (n3 * 9) + (n4 * 8) + (n5 * 7) + (n6 * 6) + (n7 * 5) + (n8 * 4) + (n9 * 3) + (d1 * 2);
  d2 := 11 - (sum % 11);
  IF d2 >= 10 THEN d2 := 0; END IF;
  
  -- Convertendo todos os inteiros para texto antes de concatenar
  RETURN n1::TEXT || n2::TEXT || n3::TEXT || '.' || n4::TEXT || n5::TEXT || n6::TEXT || '.' || n7::TEXT || n8::TEXT || n9::TEXT || '-' || d1::TEXT || d2::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Inserir clientes para Sabesp (80 clientes)
DO $$
DECLARE
  i INT;
  customer_id UUID;
  first_names TEXT[] := ARRAY['João', 'Maria', 'José', 'Ana', 'Pedro', 'Carla', 'Paulo', 'Juliana', 'Carlos', 'Fernanda'];
  last_names TEXT[] := ARRAY['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento'];
BEGIN
  FOR i IN 1..80 LOOP
    INSERT INTO customers (company_id, name, document, document_type, email, phone, address, city, state, zip_code, created_at, updated_at)
    VALUES (
      '11111111-1111-1111-1111-111111111111',
      first_names[1 + floor(random() * 10)] || ' ' || last_names[1 + floor(random() * 10)],
      generate_cpf(),
      'CPF',
      'cliente' || i || '@sabesp.demo.com',
      '(11) 9' || lpad(floor(random() * 100000000)::TEXT, 8, '0'),
      'Rua ' || (first_names[1 + floor(random() * 10)]) || ', ' || (100 + floor(random() * 900)),
      'São Paulo',
      'SP',
      lpad(floor(random() * 100000)::TEXT, 5, '0') || '-' || lpad(floor(random() * 1000)::TEXT, 3, '0'),
      NOW() - (random() * 365 || ' days')::INTERVAL,
      NOW()
    )
    RETURNING id INTO customer_id;
    
    -- 70% dos clientes têm dívidas
    IF random() < 0.7 THEN
      -- Inserir 1-3 dívidas por cliente
      FOR j IN 1..(1 + floor(random() * 3)) LOOP
        INSERT INTO debts (
          company_id,
          customer_id,
          external_id,
          amount,
          due_date,
          status,
          classification,
          description,
          created_at,
          updated_at
        )
        VALUES (
          '11111111-1111-1111-1111-111111111111',
          customer_id,
          'SAB-' || lpad(i::TEXT, 6, '0') || '-' || j,
          50 + (random() * 950)::NUMERIC(10,2),
          (NOW() - (random() * 180 || ' days')::INTERVAL)::DATE,
          CASE 
            WHEN (NOW() - (random() * 180 || ' days')::INTERVAL) < NOW() THEN 'overdue'
            ELSE 'pending'
          END,
          CASE 
            WHEN random() < 0.2 THEN 'critical'
            WHEN random() < 0.5 THEN 'high'
            WHEN random() < 0.8 THEN 'medium'
            ELSE 'low'
          END,
          'Fatura de água - Referência ' || to_char(NOW() - (random() * 180 || ' days')::INTERVAL, 'MM/YYYY'),
          NOW() - (random() * 180 || ' days')::INTERVAL,
          NOW()
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Inserir clientes para Enel (80 clientes)
DO $$
DECLARE
  i INT;
  customer_id UUID;
  first_names TEXT[] := ARRAY['Ricardo', 'Beatriz', 'Fernando', 'Patrícia', 'Roberto', 'Camila', 'Marcos', 'Luciana', 'André', 'Renata'];
  last_names TEXT[] := ARRAY['Ferreira', 'Martins', 'Gomes', 'Ribeiro', 'Carvalho', 'Araújo', 'Dias', 'Moreira', 'Barbosa', 'Pinto'];
BEGIN
  FOR i IN 1..80 LOOP
    INSERT INTO customers (company_id, name, document, document_type, email, phone, address, city, state, zip_code, created_at, updated_at)
    VALUES (
      '22222222-2222-2222-2222-222222222222',
      first_names[1 + floor(random() * 10)] || ' ' || last_names[1 + floor(random() * 10)],
      generate_cpf(),
      'CPF',
      'cliente' || i || '@enel.demo.com',
      '(11) 9' || lpad(floor(random() * 100000000)::TEXT, 8, '0'),
      'Av. ' || (first_names[1 + floor(random() * 10)]) || ', ' || (100 + floor(random() * 900)),
      'São Paulo',
      'SP',
      lpad(floor(random() * 100000)::TEXT, 5, '0') || '-' || lpad(floor(random() * 1000)::TEXT, 3, '0'),
      NOW() - (random() * 365 || ' days')::INTERVAL,
      NOW()
    )
    RETURNING id INTO customer_id;
    
    IF random() < 0.7 THEN
      FOR j IN 1..(1 + floor(random() * 3)) LOOP
        INSERT INTO debts (
          company_id,
          customer_id,
          external_id,
          amount,
          due_date,
          status,
          classification,
          description,
          created_at,
          updated_at
        )
        VALUES (
          '22222222-2222-2222-2222-222222222222',
          customer_id,
          'ENEL-' || lpad(i::TEXT, 6, '0') || '-' || j,
          100 + (random() * 1400)::NUMERIC(10,2),
          (NOW() - (random() * 180 || ' days')::INTERVAL)::DATE,
          CASE 
            WHEN (NOW() - (random() * 180 || ' days')::INTERVAL) < NOW() THEN 'overdue'
            ELSE 'pending'
          END,
          CASE 
            WHEN random() < 0.2 THEN 'critical'
            WHEN random() < 0.5 THEN 'high'
            WHEN random() < 0.8 THEN 'medium'
            ELSE 'low'
          END,
          'Fatura de energia - Referência ' || to_char(NOW() - (random() * 180 || ' days')::INTERVAL, 'MM/YYYY'),
          NOW() - (random() * 180 || ' days')::INTERVAL,
          NOW()
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Inserir clientes para ProvedorX (80 clientes)
DO $$
DECLARE
  i INT;
  customer_id UUID;
  first_names TEXT[] := ARRAY['Gabriel', 'Amanda', 'Rafael', 'Larissa', 'Bruno', 'Vanessa', 'Diego', 'Priscila', 'Lucas', 'Tatiana'];
  last_names TEXT[] := ARRAY['Mendes', 'Rocha', 'Nunes', 'Monteiro', 'Freitas', 'Cardoso', 'Teixeira', 'Ramos', 'Correia', 'Castro'];
BEGIN
  FOR i IN 1..80 LOOP
    INSERT INTO customers (company_id, name, document, document_type, email, phone, address, city, state, zip_code, created_at, updated_at)
    VALUES (
      '33333333-3333-3333-3333-333333333333',
      first_names[1 + floor(random() * 10)] || ' ' || last_names[1 + floor(random() * 10)],
      generate_cpf(),
      'CPF',
      'cliente' || i || '@provedorx.demo.com',
      '(11) 9' || lpad(floor(random() * 100000000)::TEXT, 8, '0'),
      'Rua ' || (first_names[1 + floor(random() * 10)]) || ', ' || (100 + floor(random() * 900)),
      'São Paulo',
      'SP',
      lpad(floor(random() * 100000)::TEXT, 5, '0') || '-' || lpad(floor(random() * 1000)::TEXT, 3, '0'),
      NOW() - (random() * 365 || ' days')::INTERVAL,
      NOW()
    )
    RETURNING id INTO customer_id;
    
    IF random() < 0.7 THEN
      FOR j IN 1..(1 + floor(random() * 3)) LOOP
        INSERT INTO debts (
          company_id,
          customer_id,
          external_id,
          amount,
          due_date,
          status,
          classification,
          description,
          created_at,
          updated_at
        )
        VALUES (
          '33333333-3333-3333-3333-333333333333',
          customer_id,
          'PVX-' || lpad(i::TEXT, 6, '0') || '-' || j,
          30 + (random() * 270)::NUMERIC(10,2),
          (NOW() - (random() * 180 || ' days')::INTERVAL)::DATE,
          CASE 
            WHEN (NOW() - (random() * 180 || ' days')::INTERVAL) < NOW() THEN 'overdue'
            ELSE 'pending'
          END,
          CASE 
            WHEN random() < 0.2 THEN 'critical'
            WHEN random() < 0.5 THEN 'high'
            WHEN random() < 0.8 THEN 'medium'
            ELSE 'low'
          END,
          'Mensalidade de internet - Referência ' || to_char(NOW() - (random() * 180 || ' days')::INTERVAL, 'MM/YYYY'),
          NOW() - (random() * 180 || ' days')::INTERVAL,
          NOW()
        );
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Limpar função temporária
DROP FUNCTION IF EXISTS generate_cpf();

-- Mostrar resumo
SELECT 
  'Empresas criadas' as tipo,
  COUNT(*) as total
FROM companies
WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
UNION ALL
SELECT 
  'Clientes criados' as tipo,
  COUNT(*) as total
FROM customers
WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333')
UNION ALL
SELECT 
  'Dívidas criadas' as tipo,
  COUNT(*) as total
FROM debts
WHERE company_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');
