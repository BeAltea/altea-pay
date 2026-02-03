# Payment API - Setup Guide

## Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL and Redis)

## Quick Start

### 1. Install Dependencies

```bash
cd services/payment-api
npm install
```

### 2. Start Infrastructure (Optional - for transaction logging)

```bash
docker compose up -d
```

This starts:
- PostgreSQL 16 on port `5433` (transaction logs database)
- Redis 7 on port `6379` (BullMQ queues)

### 3. Environment Configuration

Copy the example env file and configure:

```bash
cp .env.example .env
```

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_PROVIDER` | `asaas` | Active provider: `asaas` or `custom` |
| `CUSTOM_GATEWAY_MODE` | `test` | Custom gateway mode: `test` only (production blocked) |
| `ASAAS_API_KEY` | - | Required when `PAYMENT_PROVIDER=asaas` |

### 4. Run Tests

```bash
cd services/payment-api
npx vitest run
```

Watch mode:

```bash
npx vitest
```

## Switching Providers

To switch from Asaas to the custom test gateway:

```env
PAYMENT_PROVIDER=custom
CUSTOM_GATEWAY_MODE=test
```

To switch back to Asaas:

```env
PAYMENT_PROVIDER=asaas
ASAAS_API_KEY=your_key_here
```

## Database Migration

Run the provider columns migration on your Supabase database:

```bash
# Apply via Supabase CLI or directly
psql -f scripts/026_add_payment_provider_columns.sql
```

This adds `provider_*` columns alongside existing `asaas_*` columns with no data migration risk.
