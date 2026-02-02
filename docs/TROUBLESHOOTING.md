# Altea Pay - Troubleshooting Guide

> Solutions to common issues encountered during development and deployment.

---

## Table of Contents

1. [Development Environment](#1-development-environment)
2. [Authentication Issues](#2-authentication-issues)
3. [Database & Supabase](#3-database--supabase)
4. [API & Server Actions](#4-api--server-actions)
5. [Payment Processing (ASAAS)](#5-payment-processing-asaas)
6. [Notifications (Email/SMS)](#6-notifications-emailsms)
7. [Collection Engine](#7-collection-engine)
8. [Build & Deployment](#8-build--deployment)
9. [Performance Issues](#9-performance-issues)

---

## 1. Development Environment

### Error: "Module not found: Can't resolve 'fs'"

**Cause:** Twilio or other Node.js modules imported in client-side code.

**Solution:** The `next.config.mjs` already handles this. If you see this error:
1. Ensure you're not importing Twilio in client components
2. Check that webpack fallbacks are configured:

```javascript
// next.config.mjs
webpack: (config, { isServer }) => {
  if (!isServer) {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      // ... other modules
    }
  }
  return config
}
```

---

### Error: "NEXT_PUBLIC_SUPABASE_URL is not defined"

**Cause:** Environment variables not loaded.

**Solutions:**
1. Ensure `.env.local` exists in project root
2. Restart the dev server after adding env vars
3. Check variable names start with `NEXT_PUBLIC_` for client-side use

```bash
# Verify env file exists
cat .env.local | head -5

# Restart dev server
pnpm dev
```

---

### Error: "pnpm: command not found"

**Solution:** Install pnpm globally:

```bash
npm install -g pnpm
# or
corepack enable
corepack prepare pnpm@latest --activate
```

---

### Hot reload not working

**Solutions:**
1. Check if `.next` folder is corrupted:
```bash
rm -rf .next
pnpm dev
```

2. Check for syntax errors in code
3. Ensure you're not editing files in `node_modules`

---

## 2. Authentication Issues

### Error: "Invalid login credentials"

**Causes & Solutions:**

1. **Wrong email/password:** Verify credentials in Supabase dashboard
2. **Email not verified:** Check if email confirmation is required
3. **User doesn't exist:** Create user via Auth > Users in Supabase

---

### User stuck on login page after successful login

**Cause:** Cookie not being set or middleware redirect issue.

**Solutions:**

1. Check browser cookies are enabled
2. Verify Supabase URL matches:
```javascript
// Should match in .env.local and Supabase dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

3. Check middleware is not blocking:
```typescript
// middleware.ts - ensure public paths include auth routes
const publicPaths = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/callback",
  // ...
]
```

---

### Error: "JWT expired"

**Cause:** Session token expired and refresh failed.

**Solution:** The Supabase client should auto-refresh. If not:

```typescript
// Force refresh
const { data, error } = await supabase.auth.refreshSession()
```

---

### User redirected to wrong dashboard

**Cause:** Profile role not set correctly.

**Solution:** Check profile in database:

```sql
SELECT id, role, company_id FROM profiles WHERE email = 'user@email.com';

-- Update if needed
UPDATE profiles SET role = 'admin' WHERE email = 'admin@company.com';
```

---

## 3. Database & Supabase

### Error: "Row level security policy violation"

**Cause:** User trying to access data they don't have permission for.

**Solutions:**

1. Check RLS policies in Supabase:
```sql
SELECT * FROM pg_policies WHERE tablename = 'customers';
```

2. Ensure company_id matches user's company
3. Use admin client for system operations:
```typescript
import { createAdminClient } from "@/lib/supabase/server"
const supabase = createAdminClient() // Bypasses RLS
```

---

### Error: "PGRST116" (No rows returned)

**Cause:** `.single()` used but query returned 0 or 2+ rows.

**Solutions:**

1. Use `.maybeSingle()` when row might not exist:
```typescript
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('id', customerId)
  .maybeSingle() // Returns null instead of error
```

2. Check your WHERE conditions

---

### Error: "duplicate key value violates unique constraint"

**Cause:** Trying to insert a record that already exists.

**Solutions:**

1. Use upsert instead of insert:
```typescript
const { data } = await supabase
  .from('customers')
  .upsert({ document: cpf, name: 'Customer' }, { onConflict: 'document' })
```

2. Check for existing record first:
```typescript
const { data: existing } = await supabase
  .from('customers')
  .select('id')
  .eq('document', cpf)
  .maybeSingle()

if (existing) {
  // Update instead
}
```

---

### Slow database queries

**Solutions:**

1. Add indexes for commonly filtered columns:
```sql
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_debts_status ON debts(status);
```

2. Use select with specific columns:
```typescript
// Bad
const { data } = await supabase.from('customers').select('*')

// Good
const { data } = await supabase.from('customers').select('id, name, email')
```

3. Use pagination:
```typescript
const { data } = await supabase
  .from('customers')
  .select('*')
  .range(0, 49) // First 50 records
```

---

## 4. API & Server Actions

### Error: "Unauthorized" on API calls

**Solutions:**

1. Check authentication:
```typescript
const { data: { user }, error } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

2. For cron jobs, check CRON_SECRET:
```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

### Server Action not working

**Checklist:**
1. File has `"use server"` at the top
2. Function is exported
3. Called from client component correctly:

```typescript
// app/actions/my-action.ts
"use server"
export async function myAction(data: any) { ... }

// Component
import { myAction } from "@/app/actions/my-action"
const result = await myAction(data)
```

---

### Error: "Cannot read properties of undefined"

**Cause:** Accessing nested property on null/undefined.

**Solution:** Use optional chaining:
```typescript
// Bad
const name = customer.profile.name

// Good
const name = customer?.profile?.name ?? 'Unknown'
```

---

## 5. Payment Processing (ASAAS)

### Error: "ASAAS_API_KEY environment variable is required"

**Solution:** Add ASAAS credentials to `.env.local`:
```env
ASAAS_API_KEY=your-api-key
ASAAS_API_URL=https://sandbox.asaas.com/api/v3
```

---

### Webhook not receiving events

**Solutions:**

1. **Local development:** Use ngrok to expose localhost:
```bash
ngrok http 3000
# Configure webhook URL: https://xxx.ngrok.io/api/webhooks/asaas
```

2. **Production:** Verify webhook URL in ASAAS dashboard:
   - URL: `https://yourdomain.com/api/webhooks/asaas`
   - Method: POST
   - Events: Select payment events

3. Check webhook logs in Supabase:
```sql
SELECT * FROM integration_logs
WHERE integration_name = 'asaas_webhook'
ORDER BY created_at DESC LIMIT 10;
```

---

### Error: "Customer not found" when creating payment

**Solution:** Create customer first:
```typescript
let customer = await getAsaasCustomerByCpfCnpj(cpf)
if (!customer) {
  customer = await createAsaasCustomer({
    name,
    cpfCnpj: cpf,
    email,
  })
}
```

---

## 6. Notifications (Email/SMS)

### Emails not sending

**Solutions:**

1. Check Resend API key:
```env
RESEND_API_KEY=re_xxxxx
```

2. Verify email format:
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  throw new Error('Invalid email format')
}
```

3. Check Resend dashboard for errors

---

### SMS not sending

**Solutions:**

1. Check Twilio credentials:
```env
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+15551234567
```

2. Verify phone format (must include country code):
```typescript
// Must be E.164 format
const phone = '+5511999999999' // Correct
const phone = '11999999999'    // Wrong
```

3. Check Twilio console for error logs

---

### Error: "Phone number is not valid"

**Solution:** Format phone number correctly:
```typescript
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned.startsWith('55')) {
    return `+55${cleaned}`
  }
  return `+${cleaned}`
}
```

---

## 7. Collection Engine

### Collection not triggering

**Checklist:**

1. **Cron job running?** Check Vercel cron logs
2. **Rule active?** Check `is_active = true` in collection_rules
3. **Customer eligible?** Recovery score >= 294 for auto collection
4. **Contact info exists?** Email or phone must be set
5. **Not already executed?** Check collection_rule_executions

```sql
-- Check rule status
SELECT id, name, is_active, last_execution_at
FROM collection_rules
WHERE company_id = 'your-company-id';

-- Check recent executions
SELECT * FROM collection_rule_executions
ORDER BY created_at DESC LIMIT 10;
```

---

### Score always returning 0

**Solutions:**

1. Check Assertiva credentials
2. Verify CPF is valid
3. Check credit_profiles table:
```sql
SELECT cpf, score_assertiva, analysis_date
FROM credit_profiles
WHERE cpf = '12345678901';
```

---

### Manual collection being triggered for good scores

**Cause:** Score threshold mismatch.

**Explanation:**
- Credit Analysis Engine: Score >= 400 = LOW risk
- Collection Engine: Score >= 294 = Auto allowed

Check which score is being used:
```typescript
// Collection engine uses recovery_score (294 threshold)
if (recoveryScore >= 294) {
  // Auto collection
} else {
  // Manual collection
}
```

---

## 8. Build & Deployment

### Error: "Type error" during build

**Solutions:**

1. The project ignores TypeScript errors during build:
```javascript
// next.config.mjs
typescript: {
  ignoreBuildErrors: true,
}
```

2. To see errors, run:
```bash
pnpm tsc --noEmit
```

---

### Build fails with memory error

**Solution:** Increase Node.js memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

---

### Vercel deployment fails

**Checklist:**
1. All environment variables set in Vercel dashboard
2. Build command: `pnpm build`
3. Install command: `pnpm install`
4. Output directory: `.next`

---

### Cron jobs not running on Vercel

**Solutions:**

1. Check `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-erp",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

2. Verify CRON_SECRET is set in Vercel env vars
3. Check Vercel Functions logs for errors

---

## 9. Performance Issues

### Pages loading slowly

**Solutions:**

1. Use Server Components (default in App Router)
2. Implement pagination for large lists
3. Use React Suspense for loading states:
```tsx
<Suspense fallback={<Loading />}>
  <CustomerList />
</Suspense>
```

---

### Too many database queries

**Solution:** Batch queries and use joins:
```typescript
// Bad: N+1 queries
for (const customer of customers) {
  const { data: debts } = await supabase
    .from('debts')
    .select('*')
    .eq('customer_id', customer.id)
}

// Good: Single query with join
const { data } = await supabase
  .from('customers')
  .select('*, debts(*)')
  .eq('company_id', companyId)
```

---

### API timeouts

**Solutions:**

1. Increase timeout in fetch:
```typescript
fetch(url, {
  signal: AbortSignal.timeout(30000) // 30 seconds
})
```

2. For long operations, use background jobs:
```typescript
// Return immediately, process in background
return NextResponse.json({ status: 'processing', jobId })
```

---

## Quick Diagnostic Commands

```bash
# Check if server is running
curl http://localhost:3000/api/health

# View recent logs
tail -f .next/server.log

# Check Supabase connection
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Test cron endpoint
curl -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/sync-erp

# Check environment variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

---

## Still Stuck?

1. **Check logs:** Browser console, terminal output, Vercel logs
2. **Search codebase:** `grep -r "error message" .`
3. **Check Supabase dashboard:** Auth, Database, Logs sections
4. **Review recent changes:** `git diff HEAD~5`
5. **Ask for help:** Create a GitHub issue with:
   - Error message
   - Steps to reproduce
   - Environment (local/production)
   - Relevant code snippets
