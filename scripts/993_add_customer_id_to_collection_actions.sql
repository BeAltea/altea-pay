-- Adiciona coluna customer_id à tabela collection_actions
-- Essa coluna armazena o ID do cliente (da VMAX ou customers) que recebeu a notificação

-- Adiciona a coluna se não existir
ALTER TABLE collection_actions
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;

-- Adiciona comentário explicativo
COMMENT ON COLUMN collection_actions.customer_id IS 'ID do cliente que recebeu a notificação (pode ser de customers ou VMAX)';

-- Cria índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_collection_actions_customer_id ON collection_actions(customer_id);

-- Força o PostgREST a recarregar o schema cache
NOTIFY pgrst, 'reload schema';

-- Verifica se a coluna foi criada
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'collection_actions' 
AND column_name IN ('customer_id', 'company_id', 'debt_id');
