# Altea Pay — Deployment Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Docker | 24+ | Container runtime |
| Docker Compose | v2+ | Local multi-container orchestration |
| Node.js | 20+ | Runtime (for local dev / migrations) |
| pnpm | 10+ | Package manager |
| kubectl | 1.28+ | Kubernetes CLI (for K8s deployment) |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Public URL of the app (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Yes | Random secret — generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL (same as NEXTAUTH_URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL (migration period) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous key (migration period) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key |
| `SUPABASE_URL` | No | Supabase URL (server-side) |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | Twilio sender phone number |
| `TWILIO_MESSAGING_SERVICE_SID` | Yes | Twilio messaging service SID |
| `ASSERTIVA_CLIENT_ID` | Yes | Assertiva OAuth client ID |
| `ASSERTIVA_CLIENT_SECRET` | Yes | Assertiva OAuth client secret |
| `ASSERTIVA_BASE_URL` | Yes | Assertiva API base URL |
| `ASSERTIVA_CALLBACK_URL` | Yes | URL Assertiva sends webhook callbacks to |
| `ASSERTIVA_WEBHOOK_SECRET` | Yes | Secret to validate Assertiva webhooks |
| `ASAAS_API_KEY` | Yes | ASAAS payment gateway API key |
| `CRON_SECRET` | Yes | Bearer token for cron endpoint authentication |
| `PORTAL_TRANSPARENCIA_API_KEY` | No | Government transparency portal API key |
| `POSTGRES_USER` | Docker | PostgreSQL user (docker-compose only) |
| `POSTGRES_PASSWORD` | Docker | PostgreSQL password (docker-compose only) |
| `POSTGRES_DB` | Docker | PostgreSQL database name (docker-compose only) |

---

## Database Setup

### 1. Start PostgreSQL

With Docker Compose (recommended):

```bash
docker compose up -d postgres
```

Or use an existing PostgreSQL instance and set `DATABASE_URL` accordingly.

### 2. Run Migrations

```bash
npx drizzle-kit push
```

This applies the Drizzle ORM schema to the database.

### 3. Seed Data (if needed)

If you have a seed script:

```bash
pnpm run db:seed
```

---

## Local Docker Deployment

### Build and Start

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f app

# Check status
docker compose ps
```

### Access the Application

- App: http://localhost:3000
- PostgreSQL: `localhost:5432` (user: `altea`, password: `altea`, db: `alteapay`)

### Run Migrations Against Docker Postgres

```bash
DATABASE_URL=postgresql://altea:altea@localhost:5432/alteapay npx drizzle-kit push
```

### Stop and Restart

```bash
# Stop
docker compose down

# Stop and remove volumes (deletes database data)
docker compose down -v

# Restart
docker compose restart app
```

### Rebuild After Code Changes

```bash
docker compose up -d --build app
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### 2. Configure Secrets

Edit `k8s/secret.yaml` with your actual values, then apply:

```bash
kubectl apply -f k8s/secret.yaml
```

> **Important:** In production, use a secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault) or sealed-secrets instead of plain YAML files.

### 3. Apply All Manifests

```bash
kubectl apply -f k8s/
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n altea-pay

# Check services
kubectl get svc -n altea-pay

# Check ingress
kubectl get ingress -n altea-pay

# View app logs
kubectl logs -n altea-pay -l app=altea-pay -f

# View postgres logs
kubectl logs -n altea-pay -l app=postgres -f
```

### 5. Run Migrations in Kubernetes

```bash
kubectl run drizzle-migrate \
  --rm -it --restart=Never \
  --namespace=altea-pay \
  --image=node:20-alpine \
  --env="DATABASE_URL=postgresql://altea:CHANGE_ME@postgres:5432/alteapay" \
  -- sh -c "npx drizzle-kit push"
```

### 6. Access the Application

If using an Ingress controller, the app will be available at the configured host (e.g. `https://app.alteapay.com`).

For local testing with port-forward:

```bash
kubectl port-forward -n altea-pay svc/altea-pay 3000:80
```

Then access http://localhost:3000.

---

## Third-Party Services

### Resend (Email)

- Purpose: Sends transactional emails (password reset, notifications)
- Signup: https://resend.com
- Config: Set `RESEND_API_KEY` with your API key

### Twilio (SMS)

- Purpose: Sends SMS notifications and collection messages
- Signup: https://www.twilio.com
- Config: Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, and `TWILIO_MESSAGING_SERVICE_SID`

### Assertiva (Credit Analysis)

- Purpose: Runs credit and behavioral analysis on customers
- Signup: https://www.assertivasolucoes.com.br
- Config: Set `ASSERTIVA_CLIENT_ID`, `ASSERTIVA_CLIENT_SECRET`, `ASSERTIVA_BASE_URL`, `ASSERTIVA_CALLBACK_URL`, and `ASSERTIVA_WEBHOOK_SECRET`
- Note: `ASSERTIVA_CALLBACK_URL` must be a publicly accessible URL that Assertiva can send webhook callbacks to

### ASAAS (Payments)

- Purpose: Payment gateway for generating boletos and processing payments
- Signup: https://www.asaas.com
- Config: Set `ASAAS_API_KEY`

### Supabase (Legacy — Migration Period)

- Purpose: Previously used for auth and database; being migrated to NextAuth + PostgreSQL
- Config: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`
- Note: These variables can be left empty once the migration is complete

---

## Cron Jobs

The application has three scheduled tasks defined in `vercel.json`:

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/sync-erp` | Every 6 hours | Syncs data with external ERP system |
| `/api/cron/process-collection-rules` | Every hour | Processes automated collection rules |
| `/api/cron/process-collection-ruler` | Every hour | Processes collection ruler engine |

### Docker (curl-based)

In Docker, cron jobs are not built-in. Use the host's crontab or a sidecar container:

```bash
# Add to host crontab
crontab -e

# Every 6 hours — sync ERP
0 */6 * * * curl -sf -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/sync-erp

# Every hour — process collection rules
0 * * * * curl -sf -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/process-collection-rules

# Every hour — process collection ruler
0 * * * * curl -sf -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/process-collection-ruler
```

### Kubernetes

Cron jobs are defined as `CronJob` resources in `k8s/cronjob.yaml`. They use a lightweight `curl` container to call the endpoints inside the cluster.

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs app

# Common issues:
# - Missing .env file → copy .env.example to .env
# - Database not ready → wait for postgres health check
# - Build failure → check Node.js / pnpm version
```

### Database connection refused

```bash
# Check if postgres is running
docker compose ps postgres

# Test connection
docker compose exec postgres pg_isready -U altea -d alteapay

# Check DATABASE_URL format
# Must be: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

### Migrations fail

```bash
# Ensure DATABASE_URL points to the correct host
# Inside Docker network: postgres (service name)
# From host machine: localhost

# Check database exists
docker compose exec postgres psql -U altea -l
```

### Port 3000 already in use

```bash
# Find and kill the process
lsof -i :3000
kill -9 <PID>

# Or change the port mapping in docker-compose.yml
# ports: "3001:3000"
```

### K8s pods in CrashLoopBackOff

```bash
# Check pod logs
kubectl logs -n altea-pay <pod-name> --previous

# Check events
kubectl describe pod -n altea-pay <pod-name>

# Common causes: missing secrets, database not reachable, image pull errors
```

---

## Validation Steps

After deployment, verify the following:

```bash
# 1. App responds
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200

# 2. Database is accessible
docker compose exec postgres pg_isready -U altea -d alteapay
# Expected: accepting connections

# 3. Auth endpoint works
curl -s http://localhost:3000/api/auth/providers
# Expected: JSON with configured providers

# 4. Cron endpoints are reachable (with auth)
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/sync-erp
# Expected: 200 or appropriate response
```
