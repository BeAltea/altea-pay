-- Script 024: Popula apenas empresas e clientes (sem dívidas que dependem de user_id)
-- As dívidas serão criadas quando houver usuários logados no sistema

DO $$
DECLARE
    company_record RECORD;
    total_companies INTEGER := 0;
    total_clients INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando população de dados simples...';

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

    -- Relatório final
    RAISE NOTICE '=== RELATÓRIO FINAL ===';
    RAISE NOTICE 'Empresas: %', total_companies;
    RAISE NOTICE 'Clientes: %', total_clients;
    RAISE NOTICE '======================';
    RAISE NOTICE 'População de dados básicos concluída com sucesso!';
    RAISE NOTICE 'IMPORTANTE: As dívidas serão criadas quando houver usuários logados no sistema.';

END $$;
