-- Payment API transaction log and webhook event tables

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS transaction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  company_id VARCHAR(255),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transaction_logs_provider ON transaction_logs(provider);
CREATE INDEX idx_transaction_logs_company_id ON transaction_logs(company_id);
CREATE INDEX idx_transaction_logs_operation ON transaction_logs(operation);
CREATE INDEX idx_transaction_logs_created_at ON transaction_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  payment_id VARCHAR(255),
  agreement_id VARCHAR(255),
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_webhook_events_provider ON webhook_events(provider);
CREATE INDEX idx_webhook_events_payment_id ON webhook_events(payment_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);
