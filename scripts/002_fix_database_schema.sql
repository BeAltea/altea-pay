-- CobrançaAuto - Fixed Database Schema
-- Corrige o erro na função EXTRACT para cálculo de days_overdue

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS agreements CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS collection_actions CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS collection_rules CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Enable RLS
ALTER DATABASE postgres SET row_security = on;

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for profiles
CREATE POLICY "Users can view and update own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Create customers table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  document TEXT NOT NULL, -- CPF or CNPJ
  document_type TEXT NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),
  email TEXT,
  phone TEXT,
  address JSONB, -- Store address as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, document)
);

-- Enable RLS on customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create policy for customers
CREATE POLICY "Users can manage own customers" ON customers
  FOR ALL USING (auth.uid() = user_id);

-- Create collection_rules table (réguas de cobrança)
CREATE TABLE collection_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  rules JSONB NOT NULL, -- Store rules configuration as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on collection_rules
ALTER TABLE collection_rules ENABLE ROW LEVEL SECURITY;

-- Create policy for collection_rules
CREATE POLICY "Users can manage own collection rules" ON collection_rules
  FOR ALL USING (auth.uid() = user_id);

-- Create debts table
CREATE TABLE debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  collection_rule_id UUID REFERENCES collection_rules(id) ON DELETE SET NULL,
  original_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  -- Fixed days_overdue calculation - CURRENT_DATE - due_date already returns INTEGER
  days_overdue INTEGER GENERATED ALWAYS AS (CURRENT_DATE - due_date) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  classification TEXT DEFAULT 'low' CHECK (classification IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  reference TEXT, -- Invoice number, contract, etc.
  metadata JSONB, -- Additional flexible data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on debts
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- Create policy for debts
CREATE POLICY "Users can manage own debts" ON debts
  FOR ALL USING (auth.uid() = user_id);

-- Create collection_actions table (histórico de ações de cobrança)
CREATE TABLE collection_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('email', 'sms', 'whatsapp', 'call', 'letter', 'visit')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'responded')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  executed_at TIMESTAMP WITH TIME ZONE,
  content TEXT,
  response TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on collection_actions
ALTER TABLE collection_actions ENABLE ROW LEVEL SECURITY;

-- Create policy for collection_actions
CREATE POLICY "Users can manage own collection actions" ON collection_actions
  FOR ALL USING (auth.uid() = user_id);

-- Create payments table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'pix', 'card', 'check', 'other')),
  reference TEXT, -- Transaction ID, check number, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policy for payments
CREATE POLICY "Users can manage own payments" ON payments
  FOR ALL USING (auth.uid() = user_id);

-- Create agreements table (acordos - preparado para futuro)
CREATE TABLE agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  debt_id UUID REFERENCES debts(id) ON DELETE CASCADE NOT NULL,
  original_amount DECIMAL(15,2) NOT NULL,
  agreed_amount DECIMAL(15,2) NOT NULL,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  installments INTEGER DEFAULT 1,
  first_due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'defaulted')),
  terms TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on agreements
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

-- Create policy for agreements
CREATE POLICY "Users can manage own agreements" ON agreements
  FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER collection_rules_updated_at BEFORE UPDATE ON collection_rules FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER debts_updated_at BEFORE UPDATE ON debts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER collection_actions_updated_at BEFORE UPDATE ON collection_actions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER agreements_updated_at BEFORE UPDATE ON agreements FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_document ON customers(document);
CREATE INDEX idx_debts_user_id ON debts(user_id);
CREATE INDEX idx_debts_customer_id ON debts(customer_id);
CREATE INDEX idx_debts_status ON debts(status);
CREATE INDEX idx_debts_classification ON debts(classification);
CREATE INDEX idx_debts_due_date ON debts(due_date);
CREATE INDEX idx_collection_actions_debt_id ON collection_actions(debt_id);
CREATE INDEX idx_collection_actions_status ON collection_actions(status);
CREATE INDEX idx_payments_debt_id ON payments(debt_id);
CREATE INDEX idx_agreements_debt_id ON agreements(debt_id);

-- Insert default collection rule
INSERT INTO collection_rules (user_id, name, description, rules) 
SELECT 
  id,
  'Régua Padrão',
  'Régua de cobrança padrão do sistema',
  '[
    {"day": 1, "action": "email", "template": "Lembrete amigável de vencimento"},
    {"day": 7, "action": "email", "template": "Primeira cobrança - 7 dias de atraso"},
    {"day": 15, "action": "sms", "template": "Segunda cobrança - 15 dias de atraso"},
    {"day": 30, "action": "whatsapp", "template": "Terceira cobrança - 30 dias de atraso"},
    {"day": 45, "action": "call", "template": "Ligação de cobrança - 45 dias de atraso"}
  ]'::jsonb
FROM profiles;
