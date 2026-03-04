-- Migration: Localize RPC Functions
-- These functions provide efficient filtering and counting for the Localize feature
-- Table: VMAX (clients), assertiva_localize_logs (query logs)

-- ============================================================================
-- Function 1: Get Localize Summary (counters)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_localize_summary(p_company_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total', (
      SELECT COUNT(*) FROM "VMAX" WHERE id_company = p_company_id
    ),
    'with_email', (
      SELECT COUNT(*) FROM "VMAX"
      WHERE id_company = p_company_id
        AND "Email" IS NOT NULL AND TRIM("Email") != ''
    ),
    'without_email', (
      SELECT COUNT(*) FROM "VMAX"
      WHERE id_company = p_company_id
        AND ("Email" IS NULL OR TRIM("Email") = '')
    ),
    'with_phone', (
      SELECT COUNT(*) FROM "VMAX"
      WHERE id_company = p_company_id
        AND (
          ("Telefone 1" IS NOT NULL AND TRIM("Telefone 1") != '')
          OR ("Telefone 2" IS NOT NULL AND TRIM("Telefone 2") != '')
        )
    ),
    'without_phone', (
      SELECT COUNT(*) FROM "VMAX"
      WHERE id_company = p_company_id
        AND ("Telefone 1" IS NULL OR TRIM("Telefone 1") = '')
        AND ("Telefone 2" IS NULL OR TRIM("Telefone 2") = '')
    ),
    'no_email_never_queried', (
      SELECT COUNT(*) FROM "VMAX" c
      WHERE c.id_company = p_company_id
        AND (c."Email" IS NULL OR TRIM(c."Email") = '')
        AND NOT EXISTS (
          SELECT 1 FROM assertiva_localize_logs l
          WHERE l.client_id = c.id AND l.company_id = p_company_id
        )
    ),
    'no_phone_never_queried', (
      SELECT COUNT(*) FROM "VMAX" c
      WHERE c.id_company = p_company_id
        AND (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
        AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
        AND NOT EXISTS (
          SELECT 1 FROM assertiva_localize_logs l
          WHERE l.client_id = c.id AND l.company_id = p_company_id
        )
    ),
    'incomplete_never_queried', (
      SELECT COUNT(*) FROM "VMAX" c
      WHERE c.id_company = p_company_id
        AND (
          (c."Email" IS NULL OR TRIM(c."Email") = '')
          OR (
            (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
            AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM assertiva_localize_logs l
          WHERE l.client_id = c.id AND l.company_id = p_company_id
        )
    ),
    'incomplete_already_queried', (
      SELECT COUNT(*) FROM "VMAX" c
      WHERE c.id_company = p_company_id
        AND (
          (c."Email" IS NULL OR TRIM(c."Email") = '')
          OR (
            (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
            AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
          )
        )
        AND EXISTS (
          SELECT 1 FROM assertiva_localize_logs l
          WHERE l.client_id = c.id AND l.company_id = p_company_id
        )
    )
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function 2: Get Localize Client IDs (for select all)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_localize_client_ids(
  p_company_id UUID,
  p_filter TEXT DEFAULT 'all'
)
RETURNS TABLE (id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id FROM "VMAX" c
  WHERE c.id_company = p_company_id
    AND (
      p_filter = 'all'
      -- No email, never queried
      OR (p_filter = 'no_email_never_queried'
          AND (c."Email" IS NULL OR TRIM(c."Email") = '')
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      -- No phone, never queried
      OR (p_filter = 'no_phone_never_queried'
          AND (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
          AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      -- Incomplete (no email OR no phone), never queried
      OR (p_filter = 'incomplete_never_queried'
          AND (
            (c."Email" IS NULL OR TRIM(c."Email") = '')
            OR (
              (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
              AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      -- Incomplete, already queried (Localize didn't find data)
      OR (p_filter = 'incomplete_already_queried'
          AND (
            (c."Email" IS NULL OR TRIM(c."Email") = '')
            OR (
              (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
              AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
            )
          )
          AND EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function 3: Get Localize Clients (paginated listing with status)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_localize_clients(
  p_company_id UUID,
  p_filter TEXT DEFAULT 'all',
  p_search TEXT DEFAULT '',
  p_page INT DEFAULT 1,
  p_per_page INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  cpf_cnpj TEXT,
  email TEXT,
  phone1 TEXT,
  phone2 TEXT,
  localize_queried BOOLEAN,
  localize_last_query TIMESTAMPTZ,
  localize_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c."Cliente" as name,
    c."CPF/CNPJ" as cpf_cnpj,
    c."Email" as email,
    c."Telefone 1" as phone1,
    c."Telefone 2" as phone2,
    EXISTS (
      SELECT 1 FROM assertiva_localize_logs l
      WHERE l.client_id = c.id AND l.company_id = p_company_id
    ) as localize_queried,
    (
      SELECT MAX(l.created_at) FROM assertiva_localize_logs l
      WHERE l.client_id = c.id AND l.company_id = p_company_id
    ) as localize_last_query,
    CASE
      -- Complete: has both email and phone
      WHEN (c."Email" IS NOT NULL AND TRIM(c."Email") != '')
           AND (
             (c."Telefone 1" IS NOT NULL AND TRIM(c."Telefone 1") != '')
             OR (c."Telefone 2" IS NOT NULL AND TRIM(c."Telefone 2") != '')
           ) THEN 'complete'
      -- No email, already queried
      WHEN (c."Email" IS NULL OR TRIM(c."Email") = '')
           AND EXISTS (
             SELECT 1 FROM assertiva_localize_logs l
             WHERE l.client_id = c.id AND l.company_id = p_company_id
           ) THEN 'localize_no_email'
      -- No phone, already queried
      WHEN (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
           AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
           AND EXISTS (
             SELECT 1 FROM assertiva_localize_logs l
             WHERE l.client_id = c.id AND l.company_id = p_company_id
           ) THEN 'localize_no_phone'
      -- No email, never queried
      WHEN (c."Email" IS NULL OR TRIM(c."Email") = '') THEN 'no_email'
      -- No phone, never queried
      WHEN (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
           AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '') THEN 'no_phone'
      ELSE 'complete'
    END as localize_status
  FROM "VMAX" c
  WHERE c.id_company = p_company_id
    -- Search filter
    AND (
      p_search = ''
      OR c."Cliente" ILIKE '%' || p_search || '%'
      OR c."CPF/CNPJ" ILIKE '%' || p_search || '%'
    )
    -- Category filter
    AND (
      p_filter = 'all'
      OR (p_filter = 'no_email_never_queried'
          AND (c."Email" IS NULL OR TRIM(c."Email") = '')
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      OR (p_filter = 'no_phone_never_queried'
          AND (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
          AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      OR (p_filter = 'incomplete_never_queried'
          AND (
            (c."Email" IS NULL OR TRIM(c."Email") = '')
            OR (
              (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
              AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      OR (p_filter = 'incomplete_already_queried'
          AND (
            (c."Email" IS NULL OR TRIM(c."Email") = '')
            OR (
              (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
              AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
            )
          )
          AND EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
    )
  ORDER BY c."Cliente"
  LIMIT p_per_page
  OFFSET (p_page - 1) * p_per_page;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function 4: Count clients for a specific filter (for pagination total)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_localize_clients_count(
  p_company_id UUID,
  p_filter TEXT DEFAULT 'all',
  p_search TEXT DEFAULT ''
)
RETURNS INT AS $$
DECLARE
  total INT;
BEGIN
  SELECT COUNT(*) INTO total
  FROM "VMAX" c
  WHERE c.id_company = p_company_id
    AND (
      p_search = ''
      OR c."Cliente" ILIKE '%' || p_search || '%'
      OR c."CPF/CNPJ" ILIKE '%' || p_search || '%'
    )
    AND (
      p_filter = 'all'
      OR (p_filter = 'no_email_never_queried'
          AND (c."Email" IS NULL OR TRIM(c."Email") = '')
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      OR (p_filter = 'no_phone_never_queried'
          AND (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
          AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      OR (p_filter = 'incomplete_never_queried'
          AND (
            (c."Email" IS NULL OR TRIM(c."Email") = '')
            OR (
              (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
              AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
            )
          )
          AND NOT EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
      OR (p_filter = 'incomplete_already_queried'
          AND (
            (c."Email" IS NULL OR TRIM(c."Email") = '')
            OR (
              (c."Telefone 1" IS NULL OR TRIM(c."Telefone 1") = '')
              AND (c."Telefone 2" IS NULL OR TRIM(c."Telefone 2") = '')
            )
          )
          AND EXISTS (
            SELECT 1 FROM assertiva_localize_logs l
            WHERE l.client_id = c.id AND l.company_id = p_company_id
          ))
    );
  RETURN total;
END;
$$ LANGUAGE plpgsql;
