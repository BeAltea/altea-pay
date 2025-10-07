-- Script de seed simplificado que funciona de primeira
-- Remove dados demo existentes e cria novos

-- 0. Tornar user_id nullable para permitir dados demo sem usuários
ALTER TABLE customers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE debts ALTER COLUMN user_id DROP NOT NULL;

-- 1. Limpar dados demo (se existirem) - ordem correta para respeitar foreign keys
-- Deletando na ordem correta: debts -> customers -> companies
DELETE FROM debts WHERE company_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

DELETE FROM customers WHERE company_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

DELETE FROM companies WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- 2. Criar 3 empresas demo
INSERT INTO companies (id, name, cnpj, email, phone, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Sabesp - Saneamento Básico', '43.776.517/0001-80', 'contato@sabesp.com.br', '(11) 3388-8000', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Enel - Energia Elétrica', '33.530.486/0001-54', 'contato@enel.com.br', '(11) 3465-2000', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'ProvedorX - Internet', '12.345.678/0001-90', 'contato@provedorx.com.br', '(11) 4002-8922', NOW(), NOW());

-- 3. Criar clientes para Sabesp (20 clientes)
INSERT INTO customers (company_id, name, document, document_type, email, phone, address, city, state, zip_code, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'João Silva', '123.456.789-01', 'CPF', 'joao.silva@email.com', '(11) 98765-4321', 'Rua A, 100', 'São Paulo', 'SP', '01000-000', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Maria Santos', '234.567.890-12', 'CPF', 'maria.santos@email.com', '(11) 98765-4322', 'Rua B, 200', 'São Paulo', 'SP', '01000-001', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Pedro Oliveira', '345.678.901-23', 'CPF', 'pedro.oliveira@email.com', '(11) 98765-4323', 'Rua C, 300', 'São Paulo', 'SP', '01000-002', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Ana Costa', '456.789.012-34', 'CPF', 'ana.costa@email.com', '(11) 98765-4324', 'Rua D, 400', 'São Paulo', 'SP', '01000-003', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Carlos Souza', '567.890.123-45', 'CPF', 'carlos.souza@email.com', '(11) 98765-4325', 'Rua E, 500', 'São Paulo', 'SP', '01000-004', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Juliana Lima', '678.901.234-56', 'CPF', 'juliana.lima@email.com', '(11) 98765-4326', 'Rua F, 600', 'São Paulo', 'SP', '01000-005', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Roberto Alves', '789.012.345-67', 'CPF', 'roberto.alves@email.com', '(11) 98765-4327', 'Rua G, 700', 'São Paulo', 'SP', '01000-006', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Fernanda Rocha', '890.123.456-78', 'CPF', 'fernanda.rocha@email.com', '(11) 98765-4328', 'Rua H, 800', 'São Paulo', 'SP', '01000-007', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Lucas Martins', '901.234.567-89', 'CPF', 'lucas.martins@email.com', '(11) 98765-4329', 'Rua I, 900', 'São Paulo', 'SP', '01000-008', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Patricia Dias', '012.345.678-90', 'CPF', 'patricia.dias@email.com', '(11) 98765-4330', 'Rua J, 1000', 'São Paulo', 'SP', '01000-009', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Ricardo Ferreira', '111.222.333-44', 'CPF', 'ricardo.ferreira@email.com', '(11) 98765-4331', 'Rua K, 1100', 'São Paulo', 'SP', '01000-010', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Camila Nunes', '222.333.444-55', 'CPF', 'camila.nunes@email.com', '(11) 98765-4332', 'Rua L, 1200', 'São Paulo', 'SP', '01000-011', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Bruno Cardoso', '333.444.555-66', 'CPF', 'bruno.cardoso@email.com', '(11) 98765-4333', 'Rua M, 1300', 'São Paulo', 'SP', '01000-012', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Aline Barbosa', '444.555.666-77', 'CPF', 'aline.barbosa@email.com', '(11) 98765-4334', 'Rua N, 1400', 'São Paulo', 'SP', '01000-013', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Thiago Mendes', '555.666.777-88', 'CPF', 'thiago.mendes@email.com', '(11) 98765-4335', 'Rua O, 1500', 'São Paulo', 'SP', '01000-014', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Vanessa Pinto', '666.777.888-99', 'CPF', 'vanessa.pinto@email.com', '(11) 98765-4336', 'Rua P, 1600', 'São Paulo', 'SP', '01000-015', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Gustavo Reis', '777.888.999-00', 'CPF', 'gustavo.reis@email.com', '(11) 98765-4337', 'Rua Q, 1700', 'São Paulo', 'SP', '01000-016', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Mariana Castro', '888.999.000-11', 'CPF', 'mariana.castro@email.com', '(11) 98765-4338', 'Rua R, 1800', 'São Paulo', 'SP', '01000-017', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Felipe Gomes', '999.000.111-22', 'CPF', 'felipe.gomes@email.com', '(11) 98765-4339', 'Rua S, 1900', 'São Paulo', 'SP', '01000-018', NOW(), NOW()),
  ('11111111-1111-1111-1111-111111111111', 'Beatriz Araujo', '000.111.222-33', 'CPF', 'beatriz.araujo@email.com', '(11) 98765-4340', 'Rua T, 2000', 'São Paulo', 'SP', '01000-019', NOW(), NOW());

-- 4. Criar clientes para Enel (15 clientes)
INSERT INTO customers (company_id, name, document, document_type, email, phone, address, city, state, zip_code, created_at, updated_at)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'Antonio Silva', '111.111.111-11', 'CPF', 'antonio.silva@email.com', '(11) 97777-1111', 'Av A, 100', 'São Paulo', 'SP', '02000-000', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Claudia Pereira', '222.222.222-22', 'CPF', 'claudia.pereira@email.com', '(11) 97777-2222', 'Av B, 200', 'São Paulo', 'SP', '02000-001', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Eduardo Santos', '333.333.333-33', 'CPF', 'eduardo.santos@email.com', '(11) 97777-3333', 'Av C, 300', 'São Paulo', 'SP', '02000-002', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Fabiana Costa', '444.444.444-44', 'CPF', 'fabiana.costa@email.com', '(11) 97777-4444', 'Av D, 400', 'São Paulo', 'SP', '02000-003', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Gabriel Lima', '555.555.555-55', 'CPF', 'gabriel.lima@email.com', '(11) 97777-5555', 'Av E, 500', 'São Paulo', 'SP', '02000-004', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Helena Alves', '666.666.666-66', 'CPF', 'helena.alves@email.com', '(11) 97777-6666', 'Av F, 600', 'São Paulo', 'SP', '02000-005', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Igor Rocha', '777.777.777-77', 'CPF', 'igor.rocha@email.com', '(11) 97777-7777', 'Av G, 700', 'São Paulo', 'SP', '02000-006', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Julia Martins', '888.888.888-88', 'CPF', 'julia.martins@email.com', '(11) 97777-8888', 'Av H, 800', 'São Paulo', 'SP', '02000-007', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Kevin Dias', '999.999.999-99', 'CPF', 'kevin.dias@email.com', '(11) 97777-9999', 'Av I, 900', 'São Paulo', 'SP', '02000-008', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Larissa Ferreira', '101.010.101-01', 'CPF', 'larissa.ferreira@email.com', '(11) 97777-0101', 'Av J, 1000', 'São Paulo', 'SP', '02000-009', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Marcos Nunes', '202.020.202-02', 'CPF', 'marcos.nunes@email.com', '(11) 97777-0202', 'Av K, 1100', 'São Paulo', 'SP', '02000-010', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Natalia Cardoso', '303.030.303-03', 'CPF', 'natalia.cardoso@email.com', '(11) 97777-0303', 'Av L, 1200', 'São Paulo', 'SP', '02000-011', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Otavio Barbosa', '404.040.404-04', 'CPF', 'otavio.barbosa@email.com', '(11) 97777-0404', 'Av M, 1300', 'São Paulo', 'SP', '02000-012', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Paula Mendes', '505.050.505-05', 'CPF', 'paula.mendes@email.com', '(11) 97777-0505', 'Av N, 1400', 'São Paulo', 'SP', '02000-013', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Renato Pinto', '606.060.606-06', 'CPF', 'renato.pinto@email.com', '(11) 97777-0606', 'Av O, 1500', 'São Paulo', 'SP', '02000-014', NOW(), NOW());

-- 5. Criar clientes para ProvedorX (15 clientes)
INSERT INTO customers (company_id, name, document, document_type, email, phone, address, city, state, zip_code, created_at, updated_at)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'Sandra Reis', '707.070.707-07', 'CPF', 'sandra.reis@email.com', '(11) 96666-0707', 'Trav A, 100', 'São Paulo', 'SP', '03000-000', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Tiago Castro', '808.080.808-08', 'CPF', 'tiago.castro@email.com', '(11) 96666-0808', 'Trav B, 200', 'São Paulo', 'SP', '03000-001', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Ursula Gomes', '909.090.909-09', 'CPF', 'ursula.gomes@email.com', '(11) 96666-0909', 'Trav C, 300', 'São Paulo', 'SP', '03000-002', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Vitor Araujo', '121.212.121-12', 'CPF', 'vitor.araujo@email.com', '(11) 96666-1212', 'Trav D, 400', 'São Paulo', 'SP', '03000-003', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Wagner Moreira', '131.313.131-13', 'CPF', 'wagner.moreira@email.com', '(11) 96666-1313', 'Trav E, 500', 'São Paulo', 'SP', '03000-004', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Yasmin Ribeiro', '141.414.141-14', 'CPF', 'yasmin.ribeiro@email.com', '(11) 96666-1414', 'Trav F, 600', 'São Paulo', 'SP', '03000-005', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Zeca Tavares', '151.515.151-15', 'CPF', 'zeca.tavares@email.com', '(11) 96666-1515', 'Trav G, 700', 'São Paulo', 'SP', '03000-006', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Alice Monteiro', '161.616.161-16', 'CPF', 'alice.monteiro@email.com', '(11) 96666-1616', 'Trav H, 800', 'São Paulo', 'SP', '03000-007', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Bernardo Correia', '171.717.171-17', 'CPF', 'bernardo.correia@email.com', '(11) 96666-1717', 'Trav I, 900', 'São Paulo', 'SP', '03000-008', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Cecilia Freitas', '181.818.181-18', 'CPF', 'cecilia.freitas@email.com', '(11) 96666-1818', 'Trav J, 1000', 'São Paulo', 'SP', '03000-009', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Daniel Azevedo', '191.919.191-19', 'CPF', 'daniel.azevedo@email.com', '(11) 96666-1919', 'Trav K, 1100', 'São Paulo', 'SP', '03000-010', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Elisa Campos', '212.121.212-21', 'CPF', 'elisa.campos@email.com', '(11) 96666-2121', 'Trav L, 1200', 'São Paulo', 'SP', '03000-011', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Fabio Duarte', '232.323.232-23', 'CPF', 'fabio.duarte@email.com', '(11) 96666-2323', 'Trav M, 1300', 'São Paulo', 'SP', '03000-012', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Giovana Lopes', '242.424.242-24', 'CPF', 'giovana.lopes@email.com', '(11) 96666-2424', 'Trav N, 1400', 'São Paulo', 'SP', '03000-013', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Henrique Soares', '252.525.252-25', 'CPF', 'henrique.soares@email.com', '(11) 96666-2525', 'Trav O, 1500', 'São Paulo', 'SP', '03000-014', NOW(), NOW());

-- 6. Criar dívidas para os clientes (mix de pending e paid)
-- Usando apenas status válidos: pending, paid, cancelled, in_negotiation
-- Dívidas vencidas usam status 'pending' com due_date no passado

-- Dívidas Sabesp (30 dívidas)
WITH sabesp_customers AS (
  SELECT id FROM customers WHERE company_id = '11111111-1111-1111-1111-111111111111' LIMIT 20
)
INSERT INTO debts (company_id, customer_id, amount, due_date, status, description, classification, created_at, updated_at)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  (RANDOM() * 500 + 100)::NUMERIC(10,2),
  CASE 
    WHEN RANDOM() < 0.6 THEN NOW() - (RANDOM() * 60 || ' days')::INTERVAL  -- 60% vencidas (due_date no passado)
    ELSE NOW() + (RANDOM() * 30 || ' days')::INTERVAL  -- 40% a vencer
  END,
  'pending',  -- Todas pending, a view debts_with_overdue calcula se está vencida
  'Conta de água - ' || TO_CHAR(NOW(), 'MM/YYYY'),
  CASE 
    WHEN RANDOM() < 0.2 THEN 'critical'
    WHEN RANDOM() < 0.5 THEN 'high'
    WHEN RANDOM() < 0.8 THEN 'medium'
    ELSE 'low'
  END,
  NOW() - (RANDOM() * 90 || ' days')::INTERVAL,
  NOW()
FROM sabesp_customers;

-- Dívidas Enel (25 dívidas)
WITH enel_customers AS (
  SELECT id FROM customers WHERE company_id = '22222222-2222-2222-2222-222222222222' LIMIT 15
)
INSERT INTO debts (company_id, customer_id, amount, due_date, status, description, classification, created_at, updated_at)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  id,
  (RANDOM() * 800 + 150)::NUMERIC(10,2),
  CASE 
    WHEN RANDOM() < 0.7 THEN NOW() - (RANDOM() * 45 || ' days')::INTERVAL  -- 70% vencidas
    ELSE NOW() + (RANDOM() * 20 || ' days')::INTERVAL  -- 30% a vencer
  END,
  'pending',
  'Conta de energia - ' || TO_CHAR(NOW(), 'MM/YYYY'),
  CASE 
    WHEN RANDOM() < 0.25 THEN 'critical'
    WHEN RANDOM() < 0.55 THEN 'high'
    WHEN RANDOM() < 0.85 THEN 'medium'
    ELSE 'low'
  END,
  NOW() - (RANDOM() * 60 || ' days')::INTERVAL,
  NOW()
FROM enel_customers;

-- Dívidas ProvedorX (20 dívidas)
WITH provedor_customers AS (
  SELECT id FROM customers WHERE company_id = '33333333-3333-3333-3333-333333333333' LIMIT 15
)
INSERT INTO debts (company_id, customer_id, amount, due_date, status, description, classification, created_at, updated_at)
SELECT 
  '33333333-3333-3333-3333-333333333333',
  id,
  (RANDOM() * 300 + 80)::NUMERIC(10,2),
  CASE 
    WHEN RANDOM() < 0.5 THEN NOW() - (RANDOM() * 30 || ' days')::INTERVAL  -- 50% vencidas
    ELSE NOW() + (RANDOM() * 15 || ' days')::INTERVAL  -- 50% a vencer
  END,
  'pending',
  'Mensalidade internet - ' || TO_CHAR(NOW(), 'MM/YYYY'),
  CASE 
    WHEN RANDOM() < 0.15 THEN 'critical'
    WHEN RANDOM() < 0.45 THEN 'high'
    WHEN RANDOM() < 0.75 THEN 'medium'
    ELSE 'low'
  END,
  NOW() - (RANDOM() * 45 || ' days')::INTERVAL,
  NOW()
FROM provedor_customers;

-- Verificar resultados
SELECT 
  c.name AS empresa,
  COUNT(DISTINCT cu.id) AS total_clientes,
  COUNT(d.id) AS total_dividas,
  SUM(CASE WHEN d.due_date < CURRENT_DATE THEN 1 ELSE 0 END) AS dividas_vencidas,
  SUM(CASE WHEN d.due_date >= CURRENT_DATE THEN 1 ELSE 0 END) AS dividas_a_vencer,
  SUM(d.amount)::NUMERIC(10,2) AS valor_total
FROM companies c
LEFT JOIN customers cu ON cu.company_id = c.id
LEFT JOIN debts d ON d.customer_id = cu.id
WHERE c.id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
)
GROUP BY c.name
ORDER BY c.name;
