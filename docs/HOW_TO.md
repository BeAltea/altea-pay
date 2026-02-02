# Altea Pay - Common Tasks & How-To Guide

> Step-by-step instructions for common development tasks.

---

## Table of Contents

1. [Working with Customers](#1-working-with-customers)
2. [Managing Debts](#2-managing-debts)
3. [Collection Rules](#3-collection-rules)
4. [Payment Processing](#4-payment-processing)
5. [Credit Analysis](#5-credit-analysis)
6. [Notifications](#6-notifications)
7. [API Development](#7-api-development)
8. [Database Operations](#8-database-operations)
9. [Authentication](#9-authentication)
10. [Testing](#10-testing)

---

## 1. Working with Customers

### Create a customer (Server Action)

```typescript
// app/actions/customer-actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"

export async function createCustomer(data: {
  name: string
  email: string
  phone: string
  document: string // CPF or CNPJ
  company_id: string
}) {
  const supabase = await createClient()

  // Validate document
  const documentType = data.document.replace(/\D/g, '').length === 11 ? 'cpf' : 'cnpj'

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      ...data,
      document_type: documentType,
    })
    .select()
    .single()

  if (error) throw error
  return customer
}
```

### Fetch customers with debts

```typescript
// In a Server Component
const supabase = await createClient()

const { data: customers } = await supabase
  .from('customers')
  .select(`
    *,
    debts (
      id,
      amount,
      status,
      due_date
    )
  `)
  .eq('company_id', companyId)
  .order('created_at', { ascending: false })
```

### Search customers by document

```typescript
const { data: customer } = await supabase
  .from('customers')
  .select('*')
  .eq('document', cpfOrCnpj.replace(/\D/g, ''))
  .single()
```

---

## 2. Managing Debts

### Create a debt

```typescript
"use server"

export async function createDebt(data: {
  customer_id: string
  company_id: string
  original_amount: number
  due_date: string
  description?: string
}) {
  const supabase = await createClient()

  const { data: debt, error } = await supabase
    .from('debts')
    .insert({
      ...data,
      current_amount: data.original_amount,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error
  return debt
}
```

### Get overdue debts

```typescript
const { data: overdueDebts } = await supabase
  .from('debts')
  .select('*, customers(*)')
  .eq('company_id', companyId)
  .eq('status', 'pending')
  .lt('due_date', new Date().toISOString().split('T')[0])
  .order('due_date', { ascending: true })
```

### Mark debt as paid

```typescript
export async function markDebtAsPaid(debtId: string, paymentData: {
  amount: number
  payment_method: 'pix' | 'boleto' | 'credit_card'
  transaction_id?: string
}) {
  const supabase = await createClient()

  // Create payment record
  await supabase.from('payments').insert({
    debt_id: debtId,
    ...paymentData,
    payment_date: new Date().toISOString().split('T')[0],
  })

  // Update debt status
  await supabase
    .from('debts')
    .update({ status: 'paid' })
    .eq('id', debtId)
}
```

### Calculate days overdue

```typescript
// The database calculates this automatically via generated column:
// days_overdue INTEGER GENERATED ALWAYS AS (CURRENT_DATE - due_date) STORED

// Or calculate in code:
const daysOverdue = Math.floor(
  (new Date().getTime() - new Date(debt.due_date).getTime()) /
  (1000 * 60 * 60 * 24)
)
```

---

## 3. Collection Rules

### Create a collection rule

```typescript
export async function createCollectionRule(data: {
  name: string
  company_id: string
  steps: Array<{
    days_after_due: number
    action_type: 'email' | 'sms' | 'whatsapp'
    template_content: string
  }>
}) {
  const supabase = await createClient()

  // Create the rule
  const { data: rule, error } = await supabase
    .from('collection_rules')
    .insert({
      name: data.name,
      company_id: data.company_id,
      is_active: true,
      execution_mode: 'automatic',
    })
    .select()
    .single()

  if (error) throw error

  // Create the steps
  const steps = data.steps.map((step, index) => ({
    rule_id: rule.id,
    step_order: index + 1,
    ...step,
    is_enabled: true,
    execution_time: '09:00',
  }))

  await supabase.from('collection_rule_steps').insert(steps)

  return rule
}
```

### Template variables for messages

```typescript
// Available variables in template_content:
const templateVariables = {
  '{customer_name}': 'Customer full name',
  '{amount}': 'Formatted amount (R$ 1.234,56)',
  '{due_date}': 'Formatted date (01/01/2025)',
  '{days_overdue}': 'Days since due date',
  '{payment_link}': 'Link to payment page',
}

// Example template:
const template = `
Olá {customer_name},

Identificamos um débito de {amount} vencido há {days_overdue} dias.

Pague agora: {payment_link}

Atenciosamente,
Equipe de Cobrança
`
```

### Trigger collection manually

```typescript
import { processCollectionByScore } from "@/lib/collection-engine"

const result = await processCollectionByScore({
  debtId: debt.id,
  customerId: customer.id,
  cpf: customer.document,
  amount: debt.current_amount,
  dueDate: debt.due_date,
})

console.log(result)
// { success: true, recovery_score: 450, action: 'AUTO_MESSAGE' }
```

---

## 4. Payment Processing

### Create ASAAS payment

```typescript
import { createAsaasCustomer, createAsaasPayment, getAsaasCustomerByCpfCnpj } from "@/lib/asaas"

export async function createPaymentForDebt(debt: any, customer: any) {
  // Check if customer exists in ASAAS
  let asaasCustomer = await getAsaasCustomerByCpfCnpj(customer.document)

  if (!asaasCustomer) {
    asaasCustomer = await createAsaasCustomer({
      name: customer.name,
      cpfCnpj: customer.document,
      email: customer.email,
      phone: customer.phone,
    })
  }

  // Create payment
  const payment = await createAsaasPayment({
    customer: asaasCustomer.id,
    billingType: 'UNDEFINED', // Customer chooses PIX/Boleto/Card
    value: debt.current_amount,
    dueDate: debt.due_date,
    description: `Débito ref. ${debt.id}`,
    externalReference: debt.id,
  })

  // Update debt with payment info
  await supabase
    .from('debts')
    .update({
      asaas_payment_id: payment.id,
      payment_link: payment.invoiceUrl,
      pix_qr_code_url: payment.pixQrCodeUrl,
    })
    .eq('id', debt.id)

  return payment
}
```

### Handle payment webhook

```typescript
// The webhook is at: app/api/webhooks/asaas/route.ts
// It handles these events:
// - PAYMENT_CREATED
// - PAYMENT_CONFIRMED
// - PAYMENT_RECEIVED (marks debt as paid)
// - PAYMENT_OVERDUE
// - PAYMENT_REFUNDED
// - PAYMENT_DELETED
```

---

## 5. Credit Analysis

### Run credit analysis

```typescript
import { analyzeDetailedWithCache } from "@/services/assertivaService"

const result = await analyzeDetailedWithCache(
  '12345678901', // CPF
  'company-uuid',
  'user-uuid' // optional
)

if (result.success) {
  console.log(result.data)
  // {
  //   score_geral: 450,
  //   score_credito: 500,
  //   score_recupere: 400,
  //   acoes: {...},
  //   credito: {...},
  //   recupere: {...},
  // }
}
```

### Apply credit decision rules

```typescript
import { decidirEntradaRegua, extrairDadosAssertivaParaAnalise } from "@/lib/credit-analysis-engine"

// Convert Assertiva data to analysis format
const clienteCredito = await extrairDadosAssertivaParaAnalise(
  assertivaData,
  debtAmount
)

// Run decision engine
const resultado = await decidirEntradaRegua(clienteCredito)

console.log(resultado)
// {
//   decisao: 'ACEITA',
//   motivo: 'R1_SCORE_ALTO',
//   riskLevel: 'LOW',
//   comportamento: 'BOM',
//   autoCollectionEnabled: true
// }
```

### Classify debt risk

```typescript
import { ClassificationEngine } from "@/lib/classification-engine"

const engine = new ClassificationEngine()

const result = engine.classify({
  daysOverdue: 45,
  amount: 2500,
  customerHistory: {
    previousPayments: 5,
    averageDelayDays: 10,
    totalDebts: 3,
  },
  paymentBehavior: 'average',
})

console.log(result)
// { classification: 'medium', appliedRule: 'Medium - 30-60 days', score: 75 }
```

---

## 6. Notifications

### Send email

```typescript
import { sendEmail } from "@/lib/notifications/email"

const result = await sendEmail({
  to: 'customer@email.com',
  subject: 'Payment Reminder',
  html: '<h1>Hello</h1><p>Your payment is due.</p>',
})

if (!result.success) {
  console.error('Email failed:', result.error)
}
```

### Send SMS

```typescript
import { sendSMS } from "@/lib/notifications/sms"

const result = await sendSMS({
  to: '+5511999999999', // Must include country code
  body: 'Your payment of R$ 100.00 is due. Pay at: https://...',
})
```

### Send WhatsApp

```typescript
import { sendWhatsApp } from "@/lib/notifications/sms"

const result = await sendWhatsApp({
  to: '+5511999999999',
  body: 'Hello! This is a payment reminder...',
})
```

### Create in-app notification

```typescript
import { createNotification } from "@/lib/notifications/create-notification"

await createNotification({
  userId: user.id,
  companyId: company.id,
  type: 'payment',
  title: 'Payment Received',
  description: 'A payment of R$ 500.00 was confirmed.',
})
```

---

## 7. API Development

### Create a new API endpoint

```typescript
// app/api/my-endpoint/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()

  // Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get query params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')

  // Fetch data
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .range((page - 1) * 10, page * 10 - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Validate with Zod
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })

  const validated = schema.safeParse(body)
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 })
  }

  // Create record
  const { data, error } = await supabase
    .from('customers')
    .insert(validated.data)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

### Create a Server Action

```typescript
// app/actions/my-action.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function myAction(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string

  const { error } = await supabase
    .from('customers')
    .insert({ name })

  if (error) {
    return { success: false, error: error.message }
  }

  // Revalidate the page to show new data
  revalidatePath('/dashboard/customers')

  return { success: true }
}
```

---

## 8. Database Operations

### Use admin client (bypasses RLS)

```typescript
import { createAdminClient } from "@/lib/supabase/server"

// Use for cron jobs or system operations
const supabase = createAdminClient()

// This bypasses Row Level Security
const { data } = await supabase
  .from('customers')
  .select('*')
  // No company_id filter needed - sees all data
```

### Run a transaction

```typescript
// Supabase doesn't have native transactions, use RPC
const { data, error } = await supabase.rpc('transfer_debt', {
  from_customer_id: 'uuid1',
  to_customer_id: 'uuid2',
  debt_id: 'uuid3',
})

// Create the function in SQL:
/*
CREATE OR REPLACE FUNCTION transfer_debt(
  from_customer_id UUID,
  to_customer_id UUID,
  debt_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE debts SET customer_id = to_customer_id WHERE id = debt_id;
  -- More operations...
END;
$$ LANGUAGE plpgsql;
*/
```

### Bulk insert

```typescript
const customers = [
  { name: 'Customer 1', email: 'c1@email.com', company_id: companyId },
  { name: 'Customer 2', email: 'c2@email.com', company_id: companyId },
  // ...
]

const { data, error } = await supabase
  .from('customers')
  .insert(customers)
  .select()
```

---

## 9. Authentication

### Check if user is authenticated

```typescript
// In Server Component
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  redirect('/auth/login')
}
```

### Get user role

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

const { data: profile } = await supabase
  .from('profiles')
  .select('role, company_id')
  .eq('id', user.id)
  .single()

// profile.role: 'super_admin' | 'admin' | 'user'
```

### Protect a page by role

```typescript
// app/dashboard/admin-only/page.tsx
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminOnlyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    redirect('/unauthorized')
  }

  return <div>Admin content</div>
}
```

---

## 10. Testing

### Test API endpoint with curl

```bash
# GET request
curl http://localhost:3000/api/customers \
  -H "Cookie: sb-access-token=your-token"

# POST request
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=your-token" \
  -d '{"name": "Test Customer", "email": "test@email.com"}'

# Test cron job
curl http://localhost:3000/api/cron/sync-erp \
  -H "Authorization: Bearer your-cron-secret"
```

### Test webhook locally

```bash
# Use ngrok to expose localhost
ngrok http 3000

# Configure ASAAS webhook URL to:
# https://your-ngrok-url.ngrok.io/api/webhooks/asaas
```

### Manual testing checklist

- [ ] Create a customer
- [ ] Add a debt
- [ ] Run credit analysis
- [ ] Trigger collection
- [ ] Verify email/SMS sent
- [ ] Complete payment flow
- [ ] Check debt marked as paid

---

## Common Patterns

### Loading states in Client Components

```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function SubmitButton() {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    try {
      await myAction()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? 'Saving...' : 'Save'}
    </Button>
  )
}
```

### Error handling in Server Actions

```typescript
"use server"

export async function safeAction(data: any) {
  try {
    // ... action logic
    return { success: true, data: result }
  } catch (error: any) {
    console.error('Action failed:', error)
    return { success: false, error: error.message }
  }
}

// Usage in component:
const result = await safeAction(data)
if (!result.success) {
  toast.error(result.error)
}
```

### Optimistic updates

```typescript
"use client"

import { useOptimistic } from "react"

export function CustomerList({ customers }: { customers: Customer[] }) {
  const [optimisticCustomers, addOptimisticCustomer] = useOptimistic(
    customers,
    (state, newCustomer: Customer) => [...state, newCustomer]
  )

  const handleAdd = async (formData: FormData) => {
    const newCustomer = { id: 'temp', name: formData.get('name') as string }
    addOptimisticCustomer(newCustomer)
    await createCustomer(formData)
  }

  return (
    <ul>
      {optimisticCustomers.map(c => <li key={c.id}>{c.name}</li>)}
    </ul>
  )
}
```
