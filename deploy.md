# Altea Pay — Deployment Guide

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development Setup (Automated)](#local-development-setup-automated)
- [Database Setup](#database-setup)
- [Local Docker Deployment (Manual)](#local-docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Third-Party Services](#third-party-services)
- [Cron Jobs](#cron-jobs)
- [Troubleshooting](#troubleshooting)
- [Validation Steps](#validation-steps)

---

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

## Local Development Setup (Automated)

The easiest way to get started with local development is to use the automated setup script. This script handles everything: Docker services, database schema, data migration from Supabase, and superadmin user creation.

### Requirements

| Requirement | Details |
|-------------|---------|
| Docker Desktop | Installed and running ([macOS](https://docs.docker.com/desktop/install/mac-install/) / [Windows](https://docs.docker.com/desktop/install/windows-install/) / [Linux](https://docs.docker.com/engine/install/)) |
| RAM | Minimum 4GB available for Docker |
| Disk Space | ~2GB for Docker images and data |
| Ports | 3000 (app), 5432 (PostgreSQL) must be available |
| `.env` file | Configured with Supabase credentials (for data migration) |

### Environment Variables for Local Setup

Create a `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | Local PostgreSQL username | `altea` |
| `POSTGRES_PASSWORD` | Local PostgreSQL password | `altea` |
| `POSTGRES_DB` | Local PostgreSQL database name | `alteapay` |
| `NEXTAUTH_SECRET` | NextAuth encryption secret | Generate with `openssl rand -base64 32` |

#### Supabase Migration Variables (Optional)

These are only required if you want to migrate data from Supabase:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `SUPABASE_DB_HOST` | Supabase database host | Supabase → Settings → Database → Host |
| `SUPABASE_DB_PORT` | Supabase database port | Usually `5432` |
| `SUPABASE_DB_NAME` | Supabase database name | Usually `postgres` |
| `SUPABASE_DB_USER` | Supabase database user | `postgres.[project-ref]` |
| `SUPABASE_DB_PASSWORD` | Supabase database password | Supabase → Settings → Database → Password |

**How to get Supabase credentials:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Copy the **Connection string** (URI format)
4. The connection string format is: `postgres://[user]:[password]@[host]:5432/postgres`
5. Split this into the individual variables in your `.env` file

### Running the Setup Script

#### For Linux/Mac:

```bash
# Make the script executable (first time only)
chmod +x start-local.sh

# Run full setup with data migration
./start-local.sh

# Run without data migration (use existing local data)
./start-local.sh --skip-migration

# Force complete reset (removes all Docker volumes)
./start-local.sh --reset
```

#### For Windows (PowerShell):

```powershell
# Run full setup with data migration
.\start-local.ps1

# Run without data migration
.\start-local.ps1 -SkipMigration

# Force complete reset
.\start-local.ps1 -Reset
```

### What the Script Does

The setup script performs these steps automatically:

| Step | Description | Duration |
|------|-------------|----------|
| 1. Pre-flight Checks | Verifies Docker, .env file, required variables | ~5 seconds |
| 2. Environment Validation | Validates all required environment variables are set | ~2 seconds |
| 3. Docker Services | Starts PostgreSQL container with health checks | ~30 seconds |
| 4. Database Schema | Applies Drizzle ORM schema migrations | ~10 seconds |
| 5. Data Migration | Exports data from Supabase, imports to local DB | ~2-5 minutes |
| 6. Superadmin User | Creates local admin user with secure password | ~5 seconds |
| 7. Application | Builds and starts the Next.js app container | ~1-2 minutes |

**Total estimated time: 3-8 minutes** (depending on data size and network speed)

### After Setup

Once the script completes, you'll see:

```
╔═══════════════════════════════════════════════════════════════════╗
║                    Setup Complete!                               ║
╚═══════════════════════════════════════════════════════════════════╝

Application URL:
  http://localhost:3000

Local Superadmin Credentials:
  Email:    admin@local.dev
  Password: [generated-password]

Database Connection:
  Host:     localhost
  Port:     5432
  User:     altea
  Password: altea
  Database: alteapay
```

#### How to Access the Application

1. Open your browser to **http://localhost:3000**
2. Log in with the superadmin credentials displayed by the script
3. The migrated data from Supabase will be available

#### View Application Logs

```bash
# All services
docker compose logs -f

# Just the app
docker compose logs -f app

# Just PostgreSQL
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail 100 app
```

#### Restart Services

```bash
# Restart all services
docker compose restart

# Restart just the app (after code changes)
docker compose up -d --build app
```

#### Stop Services

```bash
# Stop (preserves data)
docker compose down

# Stop and delete all data (full reset)
docker compose down -v
```

### Troubleshooting Local Setup

#### "Docker is not running"

**Solution:** Start Docker Desktop and wait for it to fully initialize before running the script.

```bash
# Verify Docker is running
docker info
```

#### "Port 3000 already in use"

**Solution:** Stop the process using port 3000 or change the port mapping.

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
# ports: "3001:3000"
```

#### "Port 5432 already in use"

**Solution:** Stop any local PostgreSQL instance or change the port.

```bash
# macOS - stop Homebrew PostgreSQL
brew services stop postgresql

# Or change the port in docker-compose.yml
# ports: "5433:5432"
```

#### "Cannot connect to Supabase"

**Solution:** Verify your Supabase credentials in `.env`:

1. Check `SUPABASE_DB_HOST` is correct (usually `aws-1-*.pooler.supabase.com`)
2. Check `SUPABASE_DB_PASSWORD` is the database password (not the anon key)
3. Ensure your IP is not blocked by Supabase's connection pooler

```bash
# Test Supabase connection manually
psql "postgres://postgres.[ref]:[password]@[host]:5432/postgres?sslmode=require"
```

#### "Database migration failed"

**Solution:** Check if the schema already exists or there are constraint violations.

```bash
# View migration logs
cat setup.log

# Reset and try again
./start-local.sh --reset
```

#### "Services not starting"

**Solution:** Check Docker logs for specific errors.

```bash
# View all logs
docker compose logs

# Check container status
docker compose ps

# Inspect a specific container
docker inspect altea-app
```

#### "Application shows blank page or errors"

**Solution:** The app might still be building or there's a runtime error.

```bash
# Check if app is healthy
docker compose ps

# View app logs for errors
docker compose logs app --tail 200

# Rebuild the app
docker compose up -d --build app
```

### Data Persistence

- **Stopping services (`docker compose down`)**: Data is preserved in Docker volumes. Your database data will still be there when you start again.

- **Full reset (`docker compose down -v`)**: This deletes all volumes including database data. Use this when you want a completely fresh start.

- **Backup local database**:
  ```bash
  # Export database to file
  docker compose exec postgres pg_dump -U altea alteapay > backup.sql

  # Restore from backup
  docker compose exec -T postgres psql -U altea alteapay < backup.sql
  ```

### Re-running the Script

- Running `./start-local.sh` again will:
  - Stop existing containers
  - Start fresh containers (but preserve data volumes)
  - Skip creating superadmin if already exists
  - Apply any new schema migrations

- To get a completely fresh database:
  ```bash
  ./start-local.sh --reset
  ```

- To preserve existing data and just restart services:
  ```bash
  ./start-local.sh --skip-migration
  ```

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
