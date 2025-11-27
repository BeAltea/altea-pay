-- Criar tabela de tarefas de cobrança
CREATE TABLE IF NOT EXISTS collection_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN ('AUTO_MESSAGE', 'ASSISTED_COLLECTION', 'MANUAL_COLLECTION', 'assisted_collection', 'manual_collection', 'follow_up')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  -- Removida foreign key para users, usando profiles ao invés
  assigned_to UUID REFERENCES profiles(id),
  notes TEXT,
  description TEXT,
  amount DECIMAL(10,2),
  due_date DATE,
  auto_dispatch_blocked BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_collection_tasks_debt ON collection_tasks(debt_id);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_customer ON collection_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_status ON collection_tasks(status);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_priority ON collection_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_collection_tasks_type ON collection_tasks(task_type);

-- RLS policies
ALTER TABLE collection_tasks ENABLE ROW LEVEL SECURITY;

-- Atualizado para usar profiles ao invés de users
CREATE POLICY "Users can view tasks for their company"
  ON collection_tasks FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers 
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create tasks"
  ON collection_tasks FOR INSERT
  WITH CHECK (
    customer_id IN (
      SELECT id FROM customers 
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update tasks"
  ON collection_tasks FOR UPDATE
  USING (
    customer_id IN (
      SELECT id FROM customers 
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Service role policy para permitir operações automáticas
CREATE POLICY "service_role_all"
  ON collection_tasks FOR ALL
  USING (true);
