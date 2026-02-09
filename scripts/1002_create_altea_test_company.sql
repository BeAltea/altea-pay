-- =============================================================================
-- Script: Create Altea-Test Company with Test Clients for ASAAS Sync Validation
-- =============================================================================
-- Purpose: Create a test environment to validate the ASAAS charge → payment → sync flow
--
-- This script creates:
-- 1. Company "Altea-Test"
-- 2. Test client "Fabio Moura Barros" with R$ 5,00 debt
-- 3. Test client "Rodrigo Moura Barbieri" with R$ 5,00 debt
-- 4. Admin user for the test company
-- =============================================================================

-- Step 1: Create the Altea-Test company
-- =============================================================================
DO $$
DECLARE
    v_company_id UUID;
    v_fabio_customer_id UUID;
    v_rodrigo_customer_id UUID;
    v_fabio_debt_id UUID;
    v_rodrigo_debt_id UUID;
BEGIN
    -- Generate a consistent UUID for the company (so we can reference it)
    v_company_id := 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID;

    -- Insert the company
    INSERT INTO public.companies (
        id,
        name,
        slug,
        email,
        cnpj,
        phone,
        address,
        city,
        state,
        zip_code,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_company_id,
        'Altea-Test',
        'altea-test',
        'admin@altea-test.com',
        '00.000.000/0001-00',
        '(11) 99999-0000',
        'Rua de Teste, 123',
        'Sao Paulo',
        'SP',
        '01000-000',
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        email = EXCLUDED.email,
        status = 'active',
        updated_at = NOW();

    RAISE NOTICE 'Company Altea-Test created/updated with ID: %', v_company_id;

    -- Step 2: Create Test Client 1 - Fabio Moura Barros
    -- =============================================================================
    v_fabio_customer_id := 'bbbbbbbb-test-test-test-bbbbbbbbbbbb'::UUID;

    INSERT INTO public.customers (
        id,
        company_id,
        name,
        email,
        phone,
        document,
        document_type,
        city,
        state,
        source_system,
        created_at,
        updated_at
    ) VALUES (
        v_fabio_customer_id,
        v_company_id,
        'Fabio Moura Barros',
        'fabio@gmail.com',
        '(11) 99999-1111',
        '417.190.108-11',
        'CPF',
        'Sao Paulo',
        'SP',
        'manual',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        document = EXCLUDED.document,
        company_id = EXCLUDED.company_id,
        updated_at = NOW();

    RAISE NOTICE 'Customer Fabio Moura Barros created/updated with ID: %', v_fabio_customer_id;

    -- Step 3: Create Test Client 2 - Rodrigo Moura Barbieri
    -- =============================================================================
    v_rodrigo_customer_id := 'cccccccc-test-test-test-cccccccccccc'::UUID;

    INSERT INTO public.customers (
        id,
        company_id,
        name,
        email,
        phone,
        document,
        document_type,
        city,
        state,
        source_system,
        created_at,
        updated_at
    ) VALUES (
        v_rodrigo_customer_id,
        v_company_id,
        'Rodrigo Moura Barbieri',
        'rodrigo@bealtea.com',
        '(11) 99999-2222',
        '277.510.428-26',
        'CPF',
        'Sao Paulo',
        'SP',
        'manual',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        document = EXCLUDED.document,
        company_id = EXCLUDED.company_id,
        updated_at = NOW();

    RAISE NOTICE 'Customer Rodrigo Moura Barbieri created/updated with ID: %', v_rodrigo_customer_id;

    -- Step 4: Create R$ 5,00 Debt for Fabio
    -- =============================================================================
    v_fabio_debt_id := 'dddddddd-test-test-test-dddddddddddd'::UUID;

    INSERT INTO public.debts (
        id,
        customer_id,
        company_id,
        original_amount,
        current_amount,
        due_date,
        description,
        status,
        classification,
        source_system,
        created_at,
        updated_at
    ) VALUES (
        v_fabio_debt_id,
        v_fabio_customer_id,
        v_company_id,
        5.00,
        5.00,
        '2025-02-01'::DATE,
        'Divida de teste - ASAAS sync',
        'pending',
        'low',
        'manual',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        original_amount = EXCLUDED.original_amount,
        current_amount = EXCLUDED.current_amount,
        due_date = EXCLUDED.due_date,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = NOW();

    RAISE NOTICE 'Debt for Fabio created/updated with ID: % (R$ 5,00, due 2025-02-01)', v_fabio_debt_id;

    -- Step 5: Create R$ 5,00 Debt for Rodrigo
    -- =============================================================================
    v_rodrigo_debt_id := 'eeeeeeee-test-test-test-eeeeeeeeeeee'::UUID;

    INSERT INTO public.debts (
        id,
        customer_id,
        company_id,
        original_amount,
        current_amount,
        due_date,
        description,
        status,
        classification,
        source_system,
        created_at,
        updated_at
    ) VALUES (
        v_rodrigo_debt_id,
        v_rodrigo_customer_id,
        v_company_id,
        5.00,
        5.00,
        '2025-02-01'::DATE,
        'Divida de teste - ASAAS sync',
        'pending',
        'low',
        'manual',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        original_amount = EXCLUDED.original_amount,
        current_amount = EXCLUDED.current_amount,
        due_date = EXCLUDED.due_date,
        description = EXCLUDED.description,
        status = EXCLUDED.status,
        updated_at = NOW();

    RAISE NOTICE 'Debt for Rodrigo created/updated with ID: % (R$ 5,00, due 2025-02-01)', v_rodrigo_debt_id;

    -- Step 6: Create VMAX entries (admin dashboard reads from VMAX)
    -- =============================================================================
    -- Insert Fabio into VMAX
    INSERT INTO public."VMAX" (
        id,
        "Cliente",
        "CPF/CNPJ",
        "Cidade",
        "UF",
        "Email",
        "Telefone",
        "Vencido",
        "Dias Inad.",
        "Vecto",
        id_company,
        approval_status
    ) VALUES (
        v_fabio_customer_id,
        'Fabio Moura Barros',
        '417.190.108-11',
        'Sao Paulo',
        'SP',
        'fabio@gmail.com',
        '(11) 99999-1111',
        '5,00',
        CURRENT_DATE - '2025-02-01'::DATE,
        '01/02/2025',
        v_company_id,
        'ACEITA'
    )
    ON CONFLICT (id) DO UPDATE SET
        "Cliente" = EXCLUDED."Cliente",
        "CPF/CNPJ" = EXCLUDED."CPF/CNPJ",
        "Email" = EXCLUDED."Email",
        "Vencido" = EXCLUDED."Vencido",
        "Dias Inad." = EXCLUDED."Dias Inad.",
        "Vecto" = EXCLUDED."Vecto",
        id_company = EXCLUDED.id_company;

    RAISE NOTICE 'VMAX entry for Fabio created/updated';

    -- Insert Rodrigo into VMAX
    INSERT INTO public."VMAX" (
        id,
        "Cliente",
        "CPF/CNPJ",
        "Cidade",
        "UF",
        "Email",
        "Telefone",
        "Vencido",
        "Dias Inad.",
        "Vecto",
        id_company,
        approval_status
    ) VALUES (
        v_rodrigo_customer_id,
        'Rodrigo Moura Barbieri',
        '277.510.428-26',
        'Sao Paulo',
        'SP',
        'rodrigo@bealtea.com',
        '(11) 99999-2222',
        '5,00',
        CURRENT_DATE - '2025-02-01'::DATE,
        '01/02/2025',
        v_company_id,
        'ACEITA'
    )
    ON CONFLICT (id) DO UPDATE SET
        "Cliente" = EXCLUDED."Cliente",
        "CPF/CNPJ" = EXCLUDED."CPF/CNPJ",
        "Email" = EXCLUDED."Email",
        "Vencido" = EXCLUDED."Vencido",
        "Dias Inad." = EXCLUDED."Dias Inad.",
        "Vecto" = EXCLUDED."Vecto",
        id_company = EXCLUDED.id_company;

    RAISE NOTICE 'VMAX entry for Rodrigo created/updated';

    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Test data created successfully!';
    RAISE NOTICE '=============================================================================';

END $$;

-- =============================================================================
-- Step 6: Create Admin User for Altea-Test
-- =============================================================================
-- OPTION A: Create a profile for the admin user
-- NOTE: The user must first register via the app (or be created in Supabase Auth)
--       Then this script will update their profile to be an admin of Altea-Test
--
-- To create the user:
-- 1. Register at the app with email: admin-test@alteapay.com, password: Gj4gx3h4wUruEdXZ
-- 2. Confirm the email (if required)
-- 3. Then run the UPDATE below to make them an admin of Altea-Test
-- =============================================================================

-- If the user already exists in profiles, update them to be admin of Altea-Test
UPDATE public.profiles
SET
    role = 'admin',
    company_id = 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID,
    company_name = 'Altea-Test',
    full_name = COALESCE(full_name, 'Admin Altea Test'),
    updated_at = NOW()
WHERE email = 'admin-test@alteapay.com';

-- If no rows were updated, insert a placeholder profile
-- (The user will need to register through the app for auth to work)
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    company_id,
    company_name,
    phone,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    'admin-test@alteapay.com',
    'Admin Altea Test',
    'admin',
    'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID,
    'Altea-Test',
    '(11) 99999-9999',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = 'admin-test@alteapay.com'
);

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Check company exists
SELECT
    '1. Company Check' as step,
    id,
    name,
    slug,
    status
FROM public.companies
WHERE name = 'Altea-Test';

-- Check customers exist
SELECT
    '2. Customers Check' as step,
    c.id,
    c.name,
    c.document,
    c.email,
    comp.name as company
FROM public.customers c
JOIN public.companies comp ON c.company_id = comp.id
WHERE c.company_id = 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID;

-- Check debts exist
SELECT
    '3. Debts Check' as step,
    c.name as cliente,
    c.document as cpf_cnpj,
    d.original_amount as valor,
    d.due_date as vencimento,
    d.status
FROM public.debts d
JOIN public.customers c ON d.customer_id = c.id
WHERE d.company_id = 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID
ORDER BY c.name;

-- Check admin profile
SELECT
    '4. Admin Profile Check' as step,
    email,
    full_name,
    role,
    company_name,
    company_id
FROM public.profiles
WHERE email = 'admin-test@alteapay.com';

-- Check VMAX entries (this is what the admin dashboard reads)
SELECT
    '5. VMAX Check' as step,
    "Cliente",
    "CPF/CNPJ",
    "Vencido",
    "Dias Inad.",
    "Vecto"
FROM public."VMAX"
WHERE id_company = 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID
ORDER BY "Cliente";

-- =============================================================================
-- Summary
-- =============================================================================
SELECT
    'SUMMARY' as info,
    (SELECT COUNT(*) FROM public.companies WHERE id = 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID) as companies_created,
    (SELECT COUNT(*) FROM public.customers WHERE company_id = 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID) as customers_created,
    (SELECT COUNT(*) FROM public.debts WHERE company_id = 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID) as debts_created,
    (SELECT COUNT(*) FROM public."VMAX" WHERE id_company = 'aaaaaaaa-test-test-test-aaaaaaaaaaaa'::UUID) as vmax_entries,
    (SELECT COUNT(*) FROM public.profiles WHERE email = 'admin-test@alteapay.com') as admin_profiles;

-- =============================================================================
-- INSTRUCTIONS
-- =============================================================================
-- After running this script:
--
-- 1. The company "Altea-Test" will be created with ID: aaaaaaaa-test-test-test-aaaaaaaaaaaa
--
-- 2. Two test customers will be created:
--    - Fabio Moura Barros (CPF: 417.190.108-11, email: fabio@gmail.com)
--    - Rodrigo Moura Barbieri (CPF: 277.510.428-26, email: rodrigo@bealtea.com)
--
-- 3. Each customer will have a R$ 5,00 debt with due date 2025-02-01 (overdue)
--
-- 4. To access the admin dashboard for Altea-Test:
--    a. Go to the app and register with email: admin-test@alteapay.com
--    b. Password: Gj4gx3h4wUruEdXZ
--    c. Confirm the email if required
--    d. The profile will automatically be set as admin of Altea-Test
--
-- 5. After login, you should see:
--    - Dashboard showing 2 customers, 2 debts, R$ 10,00 total debt
--    - Clientes page with Fabio and Rodrigo listed
--    - You can now test ASAAS sync by creating agreements/charges
-- =============================================================================
