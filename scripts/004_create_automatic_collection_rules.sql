-- Criar as 2 réguas de cobrança automáticas padrão do sistema

-- Régua 1: Análise de Score (Assertiva)
-- Esta régua aplica automaticamente a aprovação baseada no score de crédito
INSERT INTO collection_rules (
  id,
  name,
  description,
  execution_mode,
  is_active,
  trigger_days,
  action_type,
  company_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Régua 1 - Análise de Score (Assertiva)',
  'Régua automática que analisa clientes via Assertiva e define aprovação baseado no score',
  'automatic',
  true,
  ARRAY[0],
  'credit_analysis',
  NULL, -- NULL = aplica para todas as empresas
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Régua 2: Cobrança Customizável
-- Esta régua permite configurar ações de cobrança em dias específicos após vencimento
INSERT INTO collection_rules (
  id,
  name,
  description,
  execution_mode,
  is_active,
  trigger_days,
  action_type,
  company_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Régua 2 - Cobrança Customizável',
  'Régua customizável onde cada empresa pode configurar seus próprios dias e canais de cobrança',
  'automatic',
  true,
  ARRAY[3, 7, 15, 30], -- Dias padrão: 3, 7, 15 e 30 dias após vencimento
  'collection',
  NULL, -- NULL = template para todas as empresas
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Verificar réguas criadas
SELECT 
  id,
  name,
  description,
  execution_mode,
  is_active,
  trigger_days,
  action_type
FROM collection_rules
ORDER BY created_at DESC;
