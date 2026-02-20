# BullMQ Queue System - AlteaPay

## Visao Geral

O sistema de filas BullMQ foi implementado para:

1. **Centralizar envio de emails** - Todos os emails passam pela fila e sao enviados via SendGrid
2. **Desabilitar emails do ASAAS** - O ASAAS nunca envia emails (emailNotificationEnabled: false)
3. **Logs e monitoramento** - Dashboard para super_admin visualizar logs de processamento

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         AlteaPay App                             │
├─────────────────────────────────────────────────────────────────┤
│  Server Actions / API Routes                                     │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Queue System (BullMQ)                        │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │   │
│  │  │ Email Queue │ │Charge Queue │ │ Notification Queue  │ │   │
│  │  └──────┬──────┘ └──────┬──────┘ └──────────┬──────────┘ │   │
│  └─────────┼───────────────┼───────────────────┼────────────┘   │
│            │               │                   │                 │
│            ▼               ▼                   ▼                 │
│       ┌─────────┐    ┌──────────┐       ┌──────────────┐        │
│       │ SendGrid│    │  ASAAS   │       │ SMS/WhatsApp │        │
│       │ (Email) │    │(Cobranca)│       │   (Twilio)   │        │
│       └─────────┘    └──────────┘       └──────────────┘        │
│            │               │                                     │
│            └───────────────┴────────────┐                       │
│                                          ▼                       │
│                               ┌──────────────────┐              │
│                               │  Queue Logs DB   │              │
│                               │   (Supabase)     │              │
│                               └──────────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │    Redis     │
                            │  (BullMQ)    │
                            └──────────────┘
```

## Estrutura de Arquivos

```
lib/queue/
├── index.ts              # Export principal
├── connection.ts         # Conexao Redis
├── config.ts            # Configuracoes de filas
├── queues.ts            # Instancias de filas
├── bull-board.ts        # Dashboard visual
└── workers/
    ├── index.ts         # Entry point dos workers
    ├── email.worker.ts  # Processa emails via SendGrid
    └── charge.worker.ts # Processa cobrancas via ASAAS

app/api/queue/
├── email/route.ts       # POST /api/queue/email
├── charge/route.ts      # POST /api/queue/charge
└── status/route.ts      # GET /api/queue/status

app/api/logs/
└── route.ts            # GET /api/logs

app/super-admin/logs/
└── page.tsx            # Dashboard de logs
```

## Uso

### Iniciar Redis (desenvolvimento)

```bash
# Iniciar Redis com Docker
pnpm docker:redis

# Parar Redis
pnpm docker:redis:stop
```

### Iniciar Workers

```bash
# Iniciar workers (producao)
pnpm workers

# Iniciar workers com hot reload (desenvolvimento)
pnpm workers:dev

# Iniciar Next.js + Workers juntos
pnpm dev:full
```

### Enviar Email via Fila

```typescript
import { sendEmail } from "@/lib/notifications/email"

// Envio automaticamente vai para a fila
await sendEmail({
  to: "cliente@email.com",
  subject: "Proposta de Negociacao",
  html: "<h1>Sua proposta</h1>...",
})
```

### Adicionar Cobranca a Fila

```typescript
import { queueCharge } from "@/lib/queue"

await queueCharge({
  customerId: "cus_123",
  asaasCustomerId: "cus_asaas_456",
  billingType: "PIX",
  value: 150.00,
  dueDate: "2026-03-15",
  metadata: {
    agreementId: "agr_789",
    companyId: "comp_001",
  }
})
```

## Regras Criticas

### 1. ASAAS NUNCA envia emails

O ASAAS so pode enviar WhatsApp e SMS. Todos os emails sao enviados pelo AlteaPay via SendGrid.

```typescript
// Em lib/asaas.ts - createAsaasPayment()
const safeParams = {
  ...params,
  emailNotificationEnabled: false,  // SEMPRE false
  postalService: false,
}
```

### 2. Todos os emails pela fila

O modulo `lib/notifications/email.tsx` foi atualizado para adicionar emails a fila ao inves de enviar diretamente:

```typescript
// Antes (Resend direto)
const resend = new Resend(...)
await resend.emails.send(...)

// Depois (via fila + SendGrid)
const job = await queueEmail(emailData)
```

## Configuracao

### Variaveis de Ambiente

```env
# Redis (desenvolvimento local)
REDIS_URL=redis://localhost:6379

# Redis (producao - Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# SendGrid
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@alteapay.com
SENDGRID_FROM_NAME=AlteaPay
SENDGRID_REPLY_TO=suporte@alteapay.com
```

### Migracao do Banco

Execute o script SQL em Supabase:

```bash
# Arquivo: scripts/migrations/create_queue_logs_table.sql
```

## Dashboard de Logs

Acesse `/super-admin/logs` para visualizar:

- Status das filas (aguardando, ativos, completos, falhas)
- Historico de jobs processados
- Filtros por fila e status
- Taxa de sucesso

## Monitoramento

### Verificar Status das Filas

```bash
GET /api/queue/status

{
  "success": true,
  "redis": { "connected": true },
  "queues": [
    { "name": "email", "waiting": 0, "active": 0, "completed": 150, "failed": 2 },
    { "name": "charge", "waiting": 5, "active": 1, "completed": 80, "failed": 0 }
  ]
}
```

## Troubleshooting

### Redis nao conecta

1. Verifique se o container esta rodando: `docker ps`
2. Verifique os logs: `docker compose logs redis`
3. Teste conexao: `docker exec alteapay-redis redis-cli ping`

### Workers nao processam

1. Verifique se os workers estao rodando
2. Verifique logs de erro no console
3. Verifique conexao com Redis via `/api/queue/status`

### Emails nao chegam

1. Verifique logs em `/super-admin/logs`
2. Verifique SENDGRID_API_KEY
3. Verifique se o dominio esta verificado no SendGrid
