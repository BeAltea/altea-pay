-- ====================================
-- MIGRAÇÃO: Score de Crédito → Score de Recuperação
-- ====================================
-- Este script atualiza as classificações de cobrança para usar
-- o Score de Recuperação (Recupere) ao invés do Score de Crédito
-- 
-- CRITÉRIO NOVO:
-- - Recovery Score >= 294 (Classes C, B, A) → Cobrança Automática
-- - Recovery Score < 294 (Classes D, E, F) → Cobrança Manual
-- ====================================

-- Passo 1: Adicionar colunas temporárias no VMAX se não existirem
DO $$
BEGIN
  -- Adiciona coluna recovery_score se não existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'VMAX' AND column_name = 'recovery_score') THEN
    ALTER TABLE "VMAX" ADD COLUMN recovery_score NUMERIC;
  END IF;
  
  -- Adiciona coluna recovery_class se não existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'VMAX' AND column_name = 'recovery_class') THEN
    ALTER TABLE "VMAX" ADD COLUMN recovery_class TEXT;
  END IF;
  
  -- Adiciona coluna recovery_description se não existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'VMAX' AND column_name = 'recovery_description') THEN
    ALTER TABLE "VMAX" ADD COLUMN recovery_description TEXT;
  END IF;
END $$;

-- Passo 2: Extrair recovery_score do analysis_metadata e atualizar VMAX
UPDATE "VMAX"
SET 
  recovery_score = COALESCE(
    (analysis_metadata->'recupere'->'resposta'->'score'->>'pontos')::numeric,
    0
  ),
  recovery_class = COALESCE(
    analysis_metadata->'recupere'->'resposta'->'score'->>'classe',
    'F'
  ),
  recovery_description = COALESCE(
    analysis_metadata->'recupere'->'resposta'->'score'->'faixa'->>'descricao',
    'Sem informação de recuperação'
  )
WHERE 
  analysis_metadata IS NOT NULL
  AND analysis_metadata->'recupere'->'resposta'->'score'->>'pontos' IS NOT NULL;

-- Passo 3: Atualizar auto_collection_enabled baseado no recovery_score
UPDATE "VMAX"
SET auto_collection_enabled = CASE
  WHEN recovery_score >= 294 THEN TRUE  -- Classes C, B, A → Automático
  ELSE FALSE                             -- Classes D, E, F → Manual
END
WHERE recovery_score IS NOT NULL;

-- Passo 4: Atualizar metadata das collection_tasks pendentes
-- Corrigido múltiplas atribuições à coluna metadata usando jsonb_set encadeado
UPDATE collection_tasks ct
SET 
  metadata = jsonb_set(
    jsonb_set(
      COALESCE(ct.metadata, '{}'::jsonb),
      '{recovery_score}',
      to_jsonb(v.recovery_score),
      true
    ),
    '{recovery_class}',
    to_jsonb(v.recovery_class),
    true
  ),
  notes = CONCAT(
    COALESCE(ct.notes, ''),
    E'\n[MIGRAÇÃO] Atualizado para usar Score de Recuperação: ',
    v.recovery_score,
    ' (Classe ',
    v.recovery_class,
    ')'
  )
FROM "VMAX" v
WHERE 
  ct.customer_id IN (
    SELECT c.id 
    FROM customers c 
    WHERE c.document = v."CPF/CNPJ"
  )
  AND ct.status IN ('pending', 'in_progress')
  AND v.recovery_score IS NOT NULL;

-- Passo 5: Bloquear auto-dispatch de tarefas com score baixo
UPDATE collection_tasks ct
SET auto_dispatch_blocked = TRUE
FROM "VMAX" v
WHERE 
  ct.customer_id IN (
    SELECT c.id 
    FROM customers c 
    WHERE c.document = v."CPF/CNPJ"
  )
  AND v.recovery_score < 294
  AND ct.status = 'pending';

-- Passo 6: Relatório de migração
DO $$
DECLARE
  total_records INTEGER;
  updated_records INTEGER;
  auto_enabled INTEGER;
  auto_disabled INTEGER;
  tasks_updated INTEGER;
  tasks_blocked INTEGER;
BEGIN
  -- Conta totais
  SELECT COUNT(*) INTO total_records FROM "VMAX";
  SELECT COUNT(*) INTO updated_records FROM "VMAX" WHERE recovery_score IS NOT NULL;
  SELECT COUNT(*) INTO auto_enabled FROM "VMAX" WHERE auto_collection_enabled = TRUE;
  SELECT COUNT(*) INTO auto_disabled FROM "VMAX" WHERE auto_collection_enabled = FALSE;
  SELECT COUNT(*) INTO tasks_updated FROM collection_tasks WHERE metadata->>'recovery_score' IS NOT NULL;
  SELECT COUNT(*) INTO tasks_blocked FROM collection_tasks WHERE auto_dispatch_blocked = TRUE;
  
  -- Exibe relatório
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RELATÓRIO DE MIGRAÇÃO - SCORE DE RECUPERAÇÃO';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de registros VMAX: %', total_records;
  RAISE NOTICE 'Registros atualizados com recovery_score: %', updated_records;
  RAISE NOTICE 'Clientes com cobrança automática (≥294): %', auto_enabled;
  RAISE NOTICE 'Clientes com cobrança manual (<294): %', auto_disabled;
  RAISE NOTICE 'Tarefas atualizadas: %', tasks_updated;
  RAISE NOTICE 'Tarefas bloqueadas (score baixo): %', tasks_blocked;
  RAISE NOTICE '========================================';
END $$;

-- Passo 7: Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_vmax_recovery_score ON "VMAX"(recovery_score);
CREATE INDEX IF NOT EXISTS idx_vmax_recovery_class ON "VMAX"(recovery_class);
CREATE INDEX IF NOT EXISTS idx_vmax_auto_collection ON "VMAX"(auto_collection_enabled);
