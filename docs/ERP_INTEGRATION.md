# Documentação de Integração ERP

## Visão Geral

O sistema Altea Pay possui um módulo modular de integração com ERPs externos que permite sincronização bidirecional de dados de clientes e dívidas.

## Arquitetura

### Componentes Principais

1. **ERPService** (`lib/integrations/erp/erpService.ts`)
   - Serviço genérico que gerencia todas as operações de integração
   - Responsável por logs, normalização e orquestração

2. **Conectores** (`lib/integrations/erp/connectors/`)
   - Implementações específicas para cada tipo de ERP
   - Interface padronizada para comunicação

3. **Normalização** (`lib/utils/normalizeData.ts`)
   - Padronização de dados de diferentes origens
   - Validação de CPF/CNPJ, datas, telefones, etc.

4. **Server Actions** (`app/actions/erp-integration.ts`)
   - Ações do servidor para operações de integração
   - Utilizadas pelos componentes React

## Fluxo de Dados

### 1. Sincronização de Clientes (GET)

\`\`\`
ERP → fetchCustomers() → normalizeCustomerData() → Supabase (customers)
\`\`\`

**Campos Mapeados:**
- `external_id` - ID do cliente no ERP
- `name` - Nome completo
- `cpfCnpj` - CPF ou CNPJ (validado)
- `email` - Email (normalizado)
- `phone` - Telefone (formatado)
- `address`, `city`, `state`, `zip_code` - Endereço completo
- `company_id` - ID da empresa (multi-tenant)

### 2. Sincronização de Dívidas (GET)

\`\`\`
ERP → fetchDebts() → normalizeDebtData() → Supabase (debts)
\`\`\`

**Campos Mapeados:**
- `external_id` - ID da dívida no ERP
- `customer_external_id` - Referência ao cliente
- `amount` - Valor da dívida
- `due_date` - Data de vencimento (ISO format)
- `description` - Descrição da dívida
- `status` - Status (pending, paid, overdue)
- `classification` - Classificação de risco
- `company_id` - ID da empresa

### 3. Envio de Resultados (POST)

\`\`\`
Supabase (payments) → formatResults() → syncResults() → ERP
\`\`\`

**Dados Enviados:**
- `external_id` - ID da dívida no ERP
- `payment_id` - ID do pagamento no Altea Pay
- `amount` - Valor pago
- `payment_date` - Data do pagamento
- `status` - Status do pagamento
- `payment_method` - Método de pagamento

## Endpoints da API

### Testar Conexão

\`\`\`typescript
POST /api/erp/test-connection
Body: { integration_id: string }
Response: { success: boolean, message: string }
\`\`\`

### Sincronizar Clientes

\`\`\`typescript
POST /api/erp/sync-customers
Body: { integration_id: string, company_id: string }
Response: {
  success: boolean,
  message: string,
  data: {
    records_processed: number,
    records_success: number,
    records_failed: number,
    duration_ms: number
  }
}
\`\`\`

### Sincronizar Dívidas

\`\`\`typescript
POST /api/erp/sync-debts
Body: { integration_id: string, company_id: string }
Response: {
  success: boolean,
  message: string,
  data: {
    records_processed: number,
    records_success: number,
    records_failed: number,
    duration_ms: number
  }
}
\`\`\`

### Enviar Resultados

\`\`\`typescript
POST /api/erp/sync-results
Body: { integration_id: string, company_id: string }
Response: {
  success: boolean,
  message: string,
  data: {
    records_processed: number,
    records_success: number,
    records_failed: number,
    duration_ms: number
  }
}
\`\`\`

## Estrutura de um Conector

### Interface ERPConnector

\`\`\`typescript
interface ERPConnector {
  name: string                    // Nome do ERP
  type: string                    // Tipo único do conector
  
  // Testa conexão com o ERP
  testConnection(config: ERPConnectionConfig): Promise<boolean>
  
  // Busca clientes do ERP
  fetchCustomers(config: ERPConnectionConfig): Promise<any[]>
  
  // Busca dívidas do ERP
  fetchDebts(config: ERPConnectionConfig): Promise<any[]>
  
  // Envia resultados de volta ao ERP
  syncResults(config: ERPConnectionConfig, data: any[]): Promise<boolean>
}
\`\`\`

### Exemplo de Implementação

\`\`\`typescript
export class MeuERPConnector implements ERPConnector {
  name = "Meu ERP"
  type = "meu-erp" as const

  async testConnection(config: ERPConnectionConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.base_url}/health`, {
        headers: this.getHeaders(config)
      })
      return response.ok
    } catch (error) {
      return false
    }
  }

  async fetchCustomers(config: ERPConnectionConfig): Promise<any[]> {
    const response = await fetch(
      `${config.base_url}${config.customers_endpoint}`,
      { headers: this.getHeaders(config) }
    )
    const data = await response.json()
    return data.customers || []
  }

  async fetchDebts(config: ERPConnectionConfig): Promise<any[]> {
    const response = await fetch(
      `${config.base_url}${config.debts_endpoint}`,
      { headers: this.getHeaders(config) }
    )
    const data = await response.json()
    return data.debts || []
  }

  async syncResults(config: ERPConnectionConfig, data: any[]): Promise<boolean> {
    const response = await fetch(
      `${config.base_url}${config.sync_endpoint}`,
      {
        method: 'POST',
        headers: { ...this.getHeaders(config), 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: data })
      }
    )
    return response.ok
  }

  private getHeaders(config: ERPConnectionConfig): Record<string, string> {
    return {
      'Authorization': `Bearer ${config.auth_token}`
    }
  }
}

// Registrar o conector
import { registerConnector } from "./index"
registerConnector(new MeuERPConnector())
\`\`\`

## Normalização de Dados

### Detecção Automática de Campos

O sistema detecta automaticamente campos equivalentes:

\`\`\`typescript
// Exemplos de mapeamento automático
const nameFields = ["name", "nome", "full_name", "razao_social"]
const docFields = ["cpf", "cnpj", "document", "documento", "tax_id"]
const emailFields = ["email", "e_mail", "mail"]
const phoneFields = ["phone", "telefone", "celular", "mobile"]
\`\`\`

### Validação de CPF/CNPJ

\`\`\`typescript
// CPF: 11 dígitos com validação de dígitos verificadores
isValidCPF("123.456.789-09") // true/false

// CNPJ: 14 dígitos com validação de dígitos verificadores
isValidCNPJ("12.345.678/0001-90") // true/false
\`\`\`

### Normalização de Datas

\`\`\`typescript
// Suporta múltiplos formatos
normalizeDate("2024-01-15")      // "2024-01-15"
normalizeDate("15/01/2024")      // "2024-01-15"
normalizeDate("15-01-2024")      // "2024-01-15"
\`\`\`

### Mapeamento de Status

\`\`\`typescript
// Mapeia status de diferentes sistemas
normalizeStatus("inadimplente")  // "inadimplente"
normalizeStatus("overdue")       // "inadimplente"
normalizeStatus("pago")          // "pago"
normalizeStatus("paid")          // "pago"
normalizeStatus("em acordo")     // "em_acordo"
\`\`\`

## Logs de Integração

### Estrutura do Log

\`\`\`typescript
interface IntegrationLog {
  id: string
  integration_id: string
  company_id: string
  operation_type: 'test_connection' | 'sync_customers' | 'sync_debts' | 'sync_results'
  status: 'success' | 'warning' | 'error'
  records_processed: number
  records_success: number
  records_failed: number
  error_message?: string
  duration_ms: number
  created_at: string
}
\`\`\`

### Consultar Logs

\`\`\`sql
-- Logs de uma integração específica
SELECT * FROM integration_logs
WHERE integration_id = 'uuid-da-integracao'
ORDER BY created_at DESC
LIMIT 100;

-- Logs com erro
SELECT * FROM integration_logs
WHERE status = 'error'
ORDER BY created_at DESC;

-- Estatísticas de sincronização
SELECT 
  operation_type,
  COUNT(*) as total,
  SUM(records_processed) as total_records,
  SUM(records_success) as total_success,
  SUM(records_failed) as total_failed,
  AVG(duration_ms) as avg_duration
FROM integration_logs
WHERE integration_id = 'uuid-da-integracao'
GROUP BY operation_type;
\`\`\`

## Sincronização Automática

### Configuração do Cron Job

O sistema usa Vercel Cron para sincronização automática:

\`\`\`json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync-erp",
    "schedule": "0 */6 * * *"  // A cada 6 horas
  }]
}
\`\`\`

### Frequências Disponíveis

- `hourly` - A cada hora
- `every_6_hours` - A cada 6 horas (padrão)
- `daily` - Uma vez por dia
- `weekly` - Uma vez por semana

### Lógica de Sincronização

\`\`\`typescript
// O cron verifica a última sincronização e a frequência configurada
const lastSync = integration.last_sync_at
const frequency = integration.sync_frequency
const hoursSinceLastSync = (now - lastSync) / (1000 * 60 * 60)

// Decide se deve sincronizar
if (frequency === 'hourly' && hoursSinceLastSync >= 1) {
  await syncIntegration(integration)
}
\`\`\`

## Tratamento de Erros

### Tipos de Erro

1. **Erro de Conexão**
   - ERP não responde
   - Timeout
   - Credenciais inválidas

2. **Erro de Normalização**
   - CPF/CNPJ inválido
   - Campos obrigatórios faltando
   - Formato de data inválido

3. **Erro de Banco de Dados**
   - Violação de constraint
   - Cliente não encontrado
   - Erro de RLS

### Estratégia de Retry

\`\`\`typescript
// Implementar retry com backoff exponencial
async function syncWithRetry(integration: Integration, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await erpService.syncCustomers(integration.id)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await sleep(Math.pow(2, i) * 1000) // 1s, 2s, 4s
    }
  }
}
\`\`\`

## Segurança

### Autenticação

- Tokens armazenados criptografados no banco
- Suporte a Bearer Token, API Key, Basic Auth
- Renovação automática de tokens (se suportado pelo ERP)

### Autorização

- Apenas admins e super_admins podem configurar integrações
- RLS garante isolamento de dados por empresa
- Service role usado para operações automáticas

### Auditoria

- Todos os logs são armazenados permanentemente
- Rastreamento de quem criou/modificou integrações
- Histórico completo de sincronizações

## Exemplos de Uso

### Criar Nova Integração

\`\`\`typescript
const formData = new FormData()
formData.append('company_id', 'uuid-da-empresa')
formData.append('erp_type', 'totvs')
formData.append('erp_name', 'TOTVS Protheus - Produção')
formData.append('base_url', 'https://api.totvs.com.br')
formData.append('auth_token', 'seu-token-aqui')
formData.append('auth_type', 'bearer')
formData.append('customers_endpoint', '/api/crm/v1/customers')
formData.append('debts_endpoint', '/api/fin/v1/receivables')
formData.append('sync_endpoint', '/api/fin/v1/receivables/batch')
formData.append('is_active', 'true')
formData.append('sync_frequency', 'every_6_hours')

const result = await createERPIntegration(formData)
\`\`\`

### Sincronizar Manualmente

\`\`\`typescript
// Testar conexão
const testResult = await testERPConnection(integrationId)

// Sincronizar clientes
const customersResult = await syncCustomersFromERP(integrationId, companyId)

// Sincronizar dívidas
const debtsResult = await syncDebtsFromERP(integrationId, companyId)

// Enviar resultados
const resultsSync = await syncResultsToERP(integrationId, companyId)
\`\`\`

## Troubleshooting

### Problema: Clientes não estão sendo sincronizados

**Possíveis causas:**
1. Endpoint incorreto
2. Formato de resposta diferente do esperado
3. Campos obrigatórios faltando

**Solução:**
\`\`\`typescript
// Adicionar logs de debug
console.log("[v0] Raw customers from ERP:", rawCustomers)
console.log("[v0] Normalized customer:", normalized)
\`\`\`

### Problema: CPF/CNPJ inválido

**Possíveis causas:**
1. Documento com máscara incorreta
2. Dígitos verificadores inválidos
3. Documento com zeros à esquerda faltando

**Solução:**
\`\`\`typescript
// Verificar limpeza do documento
const cleaned = cleanDocument(document)
console.log("[v0] Cleaned document:", cleaned)
console.log("[v0] Is valid:", isValidDocument(cleaned))
\`\`\`

### Problema: Sincronização muito lenta

**Possíveis causas:**
1. Muitos registros sendo processados
2. Validações complexas
3. Latência da API do ERP

**Solução:**
\`\`\`typescript
// Implementar processamento em lote
const batchSize = 100
for (let i = 0; i < customers.length; i += batchSize) {
  const batch = customers.slice(i, i + batchSize)
  await processBatch(batch)
}
\`\`\`

## Roadmap

### Próximas Funcionalidades

- [ ] Suporte a webhooks para sincronização em tempo real
- [ ] Interface gráfica para mapeamento de campos
- [ ] Suporte a transformações customizadas
- [ ] Retry automático com backoff exponencial
- [ ] Notificações de erro por email/SMS
- [ ] Dashboard de monitoramento de integrações
- [ ] Suporte a múltiplas integrações por empresa
- [ ] Sincronização incremental (apenas mudanças)
