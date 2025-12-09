# Altea Pay - Sistema de Cobrança Inteligente

Sistema completo de gestão de cobrança e recuperação de crédito com inteligência artificial, desenvolvido pela Altea Pay. Plataforma SaaS multi-tenant que permite empresas gerenciarem inadimplência de forma automatizada e inteligente.

## Tecnologias Utilizadas

### Frontend
- **Next.js 15** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (componentes)
- **Lucide Icons**

### Backend
- **Supabase** (PostgreSQL + Auth)
- **Next.js API Routes**
- **Server Actions**
- **Vercel Cron** (agendamento)

### Integrações
- **Supabase Auth** (autenticação)
- **Vercel Analytics**
- **ERPs externos** (TOTVS, genérico)

## Arquitetura do Sistema

### 3 Níveis de Acesso

1. **Super Admin** (`/super-admin`) - Gestão da plataforma Altea Pay
2. **Admin** (`/dashboard`) - Gestão de cobrança da empresa
3. **User** (`/user-dashboard`) - Autoatendimento para devedores

### Estrutura Multi-Tenant

O sistema utiliza `company_id` para isolar dados entre empresas:
- Cada empresa tem seus próprios clientes, dívidas e configurações
- Row Level Security (RLS) garante isolamento total de dados
- Super Admin pode visualizar todas as empresas
- Admins e usuários veem apenas dados da própria empresa

## Instalação e Configuração

### 1. Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase
- Conta no Vercel (para deploy)

### 2. Clonar o Repositório

\`\`\`bash
git clone <repository-url>
cd cobranca-auto
npm install
\`\`\`

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` com as seguintes variáveis:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Vercel Cron (para produção)
CRON_SECRET=your_random_secret_key
\`\`\`

### 4. Configurar Banco de Dados

Execute os scripts SQL na ordem:

\`\`\`bash
# 1. Criar tabelas de integração ERP
# Execute: scripts/002_create_erp_integration_tables.sql

# 2. Ativar Row Level Security
# Execute: scripts/003_enable_rls_security.sql
\`\`\`

### 5. Popular com Dados Demo (Opcional)

\`\`\`bash
# Instalar dependências Python
pip install supabase-py

# Executar seed
python scripts/seed-demo.py
\`\`\`

### 6. Executar Localmente

\`\`\`bash
npm run dev
\`\`\`

Acesse: `http://localhost:3000`

## Estrutura de Pastas

\`\`\`
cobranca-auto/
├── app/                          # Next.js App Router
│   ├── auth/                     # Páginas de autenticação
│   ├── dashboard/                # Dashboard Admin
│   ├── super-admin/              # Dashboard Super Admin
│   ├── user-dashboard/           # Dashboard Cliente
│   ├── api/                      # API Routes
│   │   └── cron/                 # Cron jobs
│   └── actions/                  # Server Actions
├── components/                   # Componentes React
│   ├── ui/                       # Componentes shadcn/ui
│   ├── dashboard/                # Componentes do dashboard
│   ├── user-dashboard/           # Componentes do user dashboard
│   └── erp/                      # Componentes de integração ERP
├── lib/                          # Bibliotecas e utilitários
│   ├── integrations/             # Integrações externas
│   │   └── erp/                  # Sistema de integração ERP
│   │       ├── connectors/       # Conectores específicos
│   │       ├── types.ts          # Tipos TypeScript
│   │       └── erpService.ts     # Serviço genérico
│   ├── supabase/                 # Cliente Supabase
│   └── utils/                    # Funções utilitárias
├── scripts/                      # Scripts SQL e Python
│   ├── 002_create_erp_integration_tables.sql
│   ├── 003_enable_rls_security.sql
│   └── seed-demo.py
└── middleware.ts                 # Middleware de autenticação
\`\`\`

## Funcionalidades Principais

### 1. Sistema de Autenticação
- Login/Registro com Supabase Auth
- Controle de acesso baseado em roles
- Verificação de email
- Recuperação de senha
- Middleware de proteção de rotas

### 2. Painel Super Admin
- Dashboard global com métricas consolidadas
- Gestão de empresas clientes (CRUD completo)
- Gestão de usuários do sistema
- Gerenciamento de clientes por empresa
- Sistema de permissões
- Configuração de integrações ERP
- Relatórios e analytics globais
- Auditoria de ações

### 3. Painel Dashboard Admin
- Dashboard executivo com KPIs
- Gestão de clientes devedores
- Gestão de dívidas
- Importação de dados (CSV/XLSX)
- Réguas de cobrança automatizadas
- Relatórios e métricas
- Configurações da conta

### 4. Painel User Dashboard
- Resumo de dívidas
- Histórico de pagamentos
- Sistema de negociação
- Análise de propensão a pagamento (IA)
- Perfil e preferências

### 5. Integração ERP

#### Arquitetura Modular
O sistema possui uma arquitetura modular que permite integração com qualquer ERP:

\`\`\`typescript
// Estrutura de um conector
interface ERPConnector {
  name: string
  type: string
  testConnection(config: ERPConnectionConfig): Promise<boolean>
  fetchCustomers(config: ERPConnectionConfig): Promise<any[]>
  fetchDebts(config: ERPConnectionConfig): Promise<any[]>
  syncResults(config: ERPConnectionConfig, data: any[]): Promise<boolean>
}
\`\`\`

#### Conectores Disponíveis
- **TOTVS Protheus** - Conector específico para TOTVS
- **Genérico** - Conector para ERPs com API REST padrão

#### Fluxo de Integração

\`\`\`
ERP Externo → GET /customers → Altea Pay (normalização) → Supabase
ERP Externo → GET /debts → Altea Pay (normalização) → Supabase
Altea Pay (processamento) → POST /results → ERP Externo
\`\`\`

#### Normalização de Dados
O sistema normaliza automaticamente dados de diferentes ERPs:
- Validação de CPF/CNPJ
- Detecção automática de campos equivalentes
- Mapeamento de status entre sistemas
- Conversão de formatos de data
- Padronização de telefones e emails

#### Configuração de Integração

1. Acesse `/super-admin/companies/[id]/erp-integration`
2. Clique em "Nova Integração"
3. Preencha os dados:
   - Tipo de ERP (TOTVS, Genérico)
   - Nome da integração
   - URL base da API
   - Token de autenticação
   - Endpoints (clientes, dívidas, sincronização)
   - Frequência de sincronização
4. Teste a conexão
5. Ative a integração

#### Sincronização Automática

O sistema possui um cron job que sincroniza automaticamente:
- **Frequência:** A cada 6 horas (configurável)
- **Endpoint:** `/api/cron/sync-erp`
- **Operações:**
  1. Busca clientes do ERP (GET)
  2. Busca dívidas do ERP (GET)
  3. Envia resultados processados (POST)

#### Logs de Integração

Todos os logs são armazenados na tabela `integration_logs`:
- Tipo de operação
- Status (success, warning, error)
- Registros processados/sucesso/falhas
- Duração da operação
- Mensagens de erro detalhadas

## Segurança

### Row Level Security (RLS)

O sistema implementa RLS em todas as tabelas sensíveis:

#### Políticas Principais

1. **profiles** - Usuário vê apenas próprio perfil
2. **companies** - Isolamento por empresa
3. **customers** - Filtrado por `company_id`
4. **debts** - Filtrado por `company_id`
5. **payments** - Filtrado por `company_id`
6. **erp_integrations** - Apenas admins gerenciam
7. **integration_logs** - Filtrado por `company_id`

#### Service Role

APIs e rotinas automáticas usam `service_role` para acesso total:
- Sincronização ERP
- Cron jobs
- Importação de dados
- Processamento em lote

### Autenticação

- Tokens JWT gerenciados pelo Supabase
- Refresh tokens automáticos
- Middleware de proteção de rotas
- Verificação de email obrigatória

## Deploy

### Vercel (Recomendado)

1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Configurar Cron Job

Adicione ao `vercel.json`:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/sync-erp",
      "schedule": "0 */6 * * *"
    }
  ]
}
\`\`\`

## Desenvolvimento

### Adicionar Novo Conector ERP

1. Crie um arquivo em `lib/integrations/erp/connectors/`:

\`\`\`typescript
// lib/integrations/erp/connectors/meu-erp.ts
import type { ERPConnector, ERPConnectionConfig } from "../types"

export class MeuERPConnector implements ERPConnector {
  name = "Meu ERP"
  type = "meu-erp" as const

  async testConnection(config: ERPConnectionConfig): Promise<boolean> {
    // Implementar teste de conexão
  }

  async fetchCustomers(config: ERPConnectionConfig): Promise<any[]> {
    // Implementar busca de clientes
  }

  async fetchDebts(config: ERPConnectionConfig): Promise<any[]> {
    // Implementar busca de dívidas
  }

  async syncResults(config: ERPConnectionConfig, data: any[]): Promise<boolean> {
    // Implementar envio de resultados
  }
}

// Registrar o conector
import { registerConnector } from "./index"
registerConnector(new MeuERPConnector())
\`\`\`

2. O conector estará disponível automaticamente no sistema

### Estrutura de Dados

#### Tabelas Principais

- **profiles** - Perfis de usuários
- **companies** - Empresas clientes
- **customers** - Clientes devedores
- **debts** - Dívidas
- **payments** - Pagamentos
- **agreements** - Acordos de pagamento
- **collection_rules** - Réguas de cobrança
- **collection_actions** - Ações de cobrança
- **data_imports** - Importações de dados
- **erp_integrations** - Configurações de ERP
- **integration_logs** - Logs de integração

## Troubleshooting

### Erro: "Integration not found"
- Verifique se a integração está ativa
- Confirme que o `integration_id` está correto
- Verifique os logs em `integration_logs`

### Erro: "Failed to normalize customer data"
- Verifique se o CPF/CNPJ é válido
- Confirme que os campos obrigatórios estão presentes
- Verifique o mapeamento de campos no conector

### Erro: "Unauthorized" no cron job
- Configure a variável `CRON_SECRET`
- Verifique se o header de autorização está correto

### RLS bloqueando operações
- Verifique se o usuário tem `company_id` configurado
- Confirme que as políticas RLS estão corretas
- Use `service_role` para operações administrativas

## Suporte

Para suporte técnico:
- Email: suporte@alteapay.com.br
- Documentação: https://docs.alteapay.com.br
- GitHub Issues: [link do repositório]

## Licença

Propriedade da Altea Pay. Todos os direitos reservados.
