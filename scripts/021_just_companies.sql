-- Script simples para inserir apenas as empresas
-- Sem updates em outras tabelas para evitar erros

DO $$
BEGIN
    -- Inserir apenas as 5 empresas brasileiras do setor utilities
    INSERT INTO public.companies (id, name, cnpj, email, phone, address, city, state, zip_code, sector, created_at, updated_at) VALUES
    ('11111111-1111-1111-1111-111111111111', 'CEMIG - Companhia Energética de Minas Gerais', '17.155.730/0001-64', 'contato@cemig.com.br', '(31) 3506-5024', 'Av. Barbacena, 1200', 'Belo Horizonte', 'MG', '30190-131', 'Energia Elétrica', NOW(), NOW()),
    ('22222222-2222-2222-2222-222222222222', 'COPEL - Companhia Paranaense de Energia', '76.483.817/0001-20', 'atendimento@copel.com', '(41) 3331-4011', 'Rua Coronel Dulcídio, 800', 'Curitiba', 'PR', '80420-170', 'Energia Elétrica', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'SABESP - Companhia de Saneamento Básico do Estado de São Paulo', '43.776.517/0001-80', 'faleconosco@sabesp.com.br', '(11) 3388-8000', 'Rua Costa Carvalho, 300', 'São Paulo', 'SP', '05429-900', 'Saneamento', NOW(), NOW()),
    ('44444444-4444-4444-4444-444444444444', 'CEDAE - Companhia Estadual de Águas e Esgotos', '33.352.394/0001-04', 'ouvidoria@cedae.com.br', '(21) 2334-9000', 'Av. Presidente Vargas, 3131', 'Rio de Janeiro', 'RJ', '20210-030', 'Saneamento', NOW(), NOW()),
    ('55555555-5555-5555-5555-555555555555', 'COPASA - Companhia de Saneamento de Minas Gerais', '17.281.106/0001-03', 'atendimento@copasa.com.br', '(31) 3250-2200', 'Rua Mar de Espanha, 525', 'Belo Horizonte', 'MG', '30285-110', 'Saneamento', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Empresas inseridas com sucesso!';
END $$;
