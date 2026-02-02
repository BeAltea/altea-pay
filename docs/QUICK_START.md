# Altea Pay - Quick Start Guide

> Get up and running with Altea Pay development in 15 minutes.

---

## Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** (recommended) or npm
- **Git**
- A code editor (VS Code recommended)

---

## 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/BeAltea/altea-pay.git
cd altea-pay

# Install dependencies
pnpm install
```

---

## 2. Environment Setup

Create a `.env.local` file in the project root:

```env
# Required - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required - App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional - Payment Gateway (ASAAS)
ASAAS_API_KEY=your-asaas-api-key
ASAAS_API_URL=https://sandbox.asaas.com/api/v3

# Optional - Credit Analysis (Assertiva)
ASSERTIVA_CLIENT_ID=your-client-id
ASSERTIVA_CLIENT_SECRET=your-client-secret
ASSERTIVA_BASE_URL=https://api.assertivasolucoes.com.br
ASSERTIVA_CALLBACK_URL=http://localhost:3000/api/assertiva/callback

# Optional - Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Optional - SMS (Twilio)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567

# Optional - Cron Jobs
CRON_SECRET=your-secret-for-cron-jobs
```

**Minimum for development:** Only Supabase variables are required to start.

---

## 3. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Access the Application

### Default Test Accounts

| Role | Email | Dashboard |
|------|-------|-----------|
| Super Admin | `super@alteapay.com` | `/super-admin` |
| Company Admin | `admin@company.com` | `/dashboard` |
| User (Debtor) | `user@email.com` | `/user-dashboard` |

> **Note:** Create accounts via Supabase Auth or the registration page.

---

## 5. Project Structure Overview

```
altea-pay/
├── app/                    # Next.js pages and API routes
│   ├── auth/              # Login, register, password reset
│   ├── dashboard/         # Admin dashboard
│   ├── super-admin/       # Platform admin
│   ├── user-dashboard/    # Debtor portal
│   └── api/               # API endpoints
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/                   # Core business logic
│   ├── supabase/         # Database clients
│   └── notifications/    # Email/SMS services
├── services/             # External integrations
└── scripts/              # Database migrations
```

---

## 6. Key Files to Know

| File | Purpose |
|------|---------|
| `middleware.ts` | Auth protection for all routes |
| `lib/supabase/server.ts` | Database client creation |
| `lib/collection-engine.ts` | Automated collection logic |
| `lib/credit-analysis-engine.ts` | Credit scoring rules |
| `app/api/webhooks/asaas/route.ts` | Payment webhook handler |

---

## 7. Common Development Tasks

### Add a new page
```bash
# Create a new page in the dashboard
mkdir -p app/dashboard/new-feature
touch app/dashboard/new-feature/page.tsx
```

### Add a new API endpoint
```bash
# Create a new API route
mkdir -p app/api/new-endpoint
touch app/api/new-endpoint/route.ts
```

### Add a new UI component
```bash
# Use shadcn/ui to add components
npx shadcn@latest add button
npx shadcn@latest add dialog
```

---

## 8. Database Access

### Server Components (recommended)
```typescript
import { createClient } from "@/lib/supabase/server"

export default async function Page() {
  const supabase = await createClient()
  const { data } = await supabase.from('customers').select('*')
  return <div>{/* render data */}</div>
}
```

### Client Components
```typescript
"use client"
import { createClient } from "@/lib/supabase/client"

export default function Component() {
  const supabase = createClient()
  // Use in useEffect or event handlers
}
```

### Server Actions
```typescript
"use server"
import { createClient } from "@/lib/supabase/server"

export async function createCustomer(data: any) {
  const supabase = await createClient()
  return supabase.from('customers').insert(data)
}
```

---

## 9. Useful Commands

```bash
# Development
pnpm dev              # Start dev server (port 3000)
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Testing API endpoints
curl http://localhost:3000/api/health

# Test cron job locally
curl -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/sync-erp
```

---

## 10. Next Steps

1. **Read the main documentation:** `docs/LEARNING_CONTEXT.md`
2. **Understand the data model:** Check `scripts/001_create_database_schema.sql`
3. **Explore the UI components:** Browse `components/ui/`
4. **Try the collection flow:** Create a customer, add a debt, trigger collection

---

## Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not defined"
- Ensure `.env.local` exists and contains the Supabase URL
- Restart the dev server after adding env variables

### "Unauthorized" errors
- Check that your Supabase anon key is correct
- Verify the user is logged in (check cookies)

### Build errors with Twilio
- Twilio is server-only; the webpack config handles this
- Don't import Twilio in client components

### See more: `docs/TROUBLESHOOTING.md`

---

## Getting Help

- **Documentation:** `docs/` folder
- **Issues:** GitHub Issues
- **Code Questions:** Search the codebase first, then ask
