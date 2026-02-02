# Altea Pay - Testing Guide

> Guide for testing the Altea Pay application, including manual testing procedures and example test cases.

---

## Table of Contents

1. [Current Testing Status](#1-current-testing-status)
2. [Manual Testing Procedures](#2-manual-testing-procedures)
3. [API Testing](#3-api-testing)
4. [Integration Testing](#4-integration-testing)
5. [Example Test Cases](#5-example-test-cases)
6. [Setting Up Automated Tests](#6-setting-up-automated-tests)

---

## 1. Current Testing Status

The codebase currently does not have an automated testing framework configured. Testing is primarily done manually.

### Recommended Testing Stack

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit tests (faster than Jest for Vite/Next.js) |
| **React Testing Library** | Component tests |
| **Playwright** | E2E tests |
| **MSW** | API mocking |

---

## 2. Manual Testing Procedures

### 2.1 Authentication Flow

#### Test: User Registration

1. Navigate to `/auth/register`
2. Fill in the form:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "TestPassword123!"
3. Click "Register"
4. **Expected:** Redirect to email verification page
5. Check email for verification link
6. Click verification link
7. **Expected:** Redirect to login page with success message

#### Test: User Login

1. Navigate to `/auth/login`
2. Enter valid credentials
3. Click "Sign In"
4. **Expected:** Redirect to appropriate dashboard based on role

#### Test: Password Reset

1. Navigate to `/auth/login`
2. Click "Forgot Password"
3. Enter email address
4. **Expected:** Email sent with reset link
5. Click reset link in email
6. Enter new password
7. **Expected:** Password updated, can login with new password

---

### 2.2 Customer Management

#### Test: Create Customer

1. Login as admin
2. Navigate to `/dashboard/clientes`
3. Click "Add Customer"
4. Fill in:
   - Name: "João Silva"
   - Email: "joao@email.com"
   - Phone: "+5511999999999"
   - CPF: "123.456.789-00"
5. Click "Save"
6. **Expected:** Customer appears in list

#### Test: Edit Customer

1. Click on customer row
2. Click "Edit"
3. Change email to "joao.new@email.com"
4. Click "Save"
5. **Expected:** Customer updated, new email shown

#### Test: Delete Customer

1. Click on customer row
2. Click "Delete"
3. Confirm deletion
4. **Expected:** Customer removed from list

---

### 2.3 Debt Management

#### Test: Create Debt

1. Navigate to `/dashboard/debts`
2. Click "Add Debt"
3. Select customer
4. Fill in:
   - Amount: 1500.00
   - Due Date: (today + 7 days)
   - Description: "Invoice #123"
5. Click "Save"
6. **Expected:** Debt appears in list with "pending" status

#### Test: Debt Classification

1. Create debt with varying:
   - Days overdue: 0, 30, 60, 90+
   - Amount: 500, 2000, 10000
2. **Expected Classifications:**
   - 0 days, R$500 → Low
   - 45 days, R$2000 → Medium
   - 90+ days → Critical

---

### 2.4 Collection Rules

#### Test: Create Collection Rule

1. Navigate to `/dashboard/collection-rules`
2. Click "New Rule"
3. Fill in:
   - Name: "Standard Collection"
   - Mode: Automatic
4. Add steps:
   - D+0: Email reminder
   - D+7: SMS reminder
   - D+15: WhatsApp
5. Activate rule
6. **Expected:** Rule appears in list as "Active"

#### Test: Rule Execution

1. Create active rule with D+0 email step
2. Create debt with due date = today
3. Trigger cron manually or wait
4. **Expected:**
   - Email sent to customer
   - Action logged in collection_actions

---

### 2.5 Payment Flow

#### Test: Generate Payment Link

1. Select a debt
2. Click "Generate Payment"
3. **Expected:** Payment link generated, shows PIX/Boleto options

#### Test: Complete Payment (Sandbox)

1. Generate payment link
2. Use ASAAS sandbox to simulate payment
3. **Expected:**
   - Webhook received
   - Debt marked as "paid"
   - Notification created

---

## 3. API Testing

### Using curl

```bash
# Set variables
export BASE_URL="http://localhost:3000"
export AUTH_COOKIE="sb-access-token=your-token-here"

# Test: List customers
curl "$BASE_URL/api/get-company-customers" \
  -H "Cookie: $AUTH_COOKIE"

# Test: Create customer (via Server Action - use form)
# Server actions don't work via curl, test via UI

# Test: Cron job
curl "$BASE_URL/api/cron/sync-erp" \
  -H "Authorization: Bearer $CRON_SECRET"

# Test: Classification
curl -X POST "$BASE_URL/api/classify" \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{"debtIds": ["uuid-1", "uuid-2"]}'

# Test: Propensity scoring
curl -X POST "$BASE_URL/api/propensity" \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{"debtId": "uuid-here"}'
```

### Using HTTPie (more readable)

```bash
# List customers
http GET "$BASE_URL/api/get-company-customers" \
  Cookie:"$AUTH_COOKIE"

# Check score
http POST "$BASE_URL/api/score-check" \
  Cookie:"$AUTH_COOKIE" \
  cpf="12345678901" \
  customerId="uuid" \
  debtId="uuid"
```

---

## 4. Integration Testing

### 4.1 Test Assertiva Integration

```bash
# Test credit analysis (requires valid Assertiva credentials)
curl -X POST "$BASE_URL/api/score-check" \
  -H "Content-Type: application/json" \
  -H "Cookie: $AUTH_COOKIE" \
  -d '{
    "cpf": "12345678901",
    "customerId": "test-customer-id",
    "debtId": "test-debt-id"
  }'

# Expected response:
# {
#   "recovery_score": 450,
#   "recovery_class": "B",
#   "risk_level": "LOW"
# }
```

### 4.2 Test ASAAS Integration

```bash
# Create payment (use ASAAS sandbox)
# This is typically done via the UI or Server Actions

# Test webhook (simulate ASAAS callback)
curl -X POST "$BASE_URL/api/webhooks/asaas" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_xxx",
      "externalReference": "debt-uuid",
      "value": 100.00,
      "customer": "cus_xxx"
    }
  }'
```

### 4.3 Test Email/SMS

```bash
# Test email (in development, check Resend dashboard)
# Create a debt and trigger collection rule

# Test SMS (check Twilio dashboard for delivery status)
```

---

## 5. Example Test Cases

### 5.1 Unit Test Examples (Vitest)

```typescript
// tests/lib/classification-engine.test.ts
import { describe, it, expect } from 'vitest'
import { ClassificationEngine } from '@/lib/classification-engine'

describe('ClassificationEngine', () => {
  const engine = new ClassificationEngine()

  describe('classify', () => {
    it('should classify debt over 90 days as critical', () => {
      const result = engine.classify({
        daysOverdue: 95,
        amount: 1000,
      })
      expect(result.classification).toBe('critical')
    })

    it('should classify debt 60-90 days as high', () => {
      const result = engine.classify({
        daysOverdue: 75,
        amount: 1000,
      })
      expect(result.classification).toBe('high')
    })

    it('should classify debt 30-60 days as medium', () => {
      const result = engine.classify({
        daysOverdue: 45,
        amount: 1000,
      })
      expect(result.classification).toBe('medium')
    })

    it('should classify debt under 30 days as low', () => {
      const result = engine.classify({
        daysOverdue: 15,
        amount: 1000,
      })
      expect(result.classification).toBe('low')
    })

    it('should classify high amount debt over 60 days as critical', () => {
      const result = engine.classify({
        daysOverdue: 65,
        amount: 6000,
      })
      expect(result.classification).toBe('critical')
    })
  })

  describe('calculateScore', () => {
    it('should calculate score based on criteria', () => {
      const result = engine.classify({
        daysOverdue: 45,
        amount: 2500,
        customerHistory: {
          previousPayments: 5,
          averageDelayDays: 10,
          totalDebts: 2,
        },
      })
      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThanOrEqual(200)
    })
  })
})
```

### 5.2 Credit Analysis Engine Tests

```typescript
// tests/lib/credit-analysis-engine.test.ts
import { describe, it, expect } from 'vitest'
import {
  decidirEntradaRegua,
  classificarComportamento,
  determinarRiskLevel,
} from '@/lib/credit-analysis-engine'

describe('Credit Analysis Engine', () => {
  describe('determinarRiskLevel', () => {
    it('should return LOW for score >= 400', async () => {
      expect(await determinarRiskLevel(450)).toBe('LOW')
      expect(await determinarRiskLevel(400)).toBe('LOW')
    })

    it('should return MEDIUM for score 300-399', async () => {
      expect(await determinarRiskLevel(350)).toBe('MEDIUM')
      expect(await determinarRiskLevel(300)).toBe('MEDIUM')
    })

    it('should return HIGH for score < 300', async () => {
      expect(await determinarRiskLevel(250)).toBe('HIGH')
      expect(await determinarRiskLevel(0)).toBe('HIGH')
    })
  })

  describe('classificarComportamento', () => {
    it('should return BOM for customer with no issues', async () => {
      const result = await classificarComportamento({
        creditScore: 500,
        atrasos12m: 0,
        temAcaoJudicial: false,
        temProtesto: false,
        temDividaAtiva: false,
        atrasosCartao24m: 0,
        limitePresumido: 5000,
        rendaPresumida: 3000,
        valorDivida: 1000,
      })
      expect(result).toBe('BOM')
    })

    it('should return RUIM for customer with delays', async () => {
      const result = await classificarComportamento({
        creditScore: 500,
        atrasos12m: 3,
        temAcaoJudicial: false,
        temProtesto: false,
        temDividaAtiva: false,
        atrasosCartao24m: 0,
        limitePresumido: 5000,
        rendaPresumida: 3000,
        valorDivida: 1000,
      })
      expect(result).toBe('RUIM')
    })
  })

  describe('decidirEntradaRegua', () => {
    it('R1: should ACCEPT with auto collection for high score', async () => {
      const result = await decidirEntradaRegua({
        creditScore: 450,
        atrasos12m: 0,
        temAcaoJudicial: false,
        temProtesto: false,
        temDividaAtiva: false,
        atrasosCartao24m: 0,
        limitePresumido: 5000,
        rendaPresumida: 3000,
        valorDivida: 1000,
      })
      expect(result.decisao).toBe('ACEITA')
      expect(result.motivo).toBe('R1_SCORE_ALTO')
      expect(result.autoCollectionEnabled).toBe(true)
    })

    it('R5: should REJECT for very low income', async () => {
      const result = await decidirEntradaRegua({
        creditScore: 450,
        atrasos12m: 0,
        temAcaoJudicial: false,
        temProtesto: false,
        temDividaAtiva: false,
        atrasosCartao24m: 0,
        limitePresumido: 5000,
        rendaPresumida: 1000, // Below 1500 threshold
        valorDivida: 1000,
      })
      expect(result.decisao).toBe('REJEITA')
      expect(result.motivo).toBe('R5_RENDA_BAIXA')
    })
  })
})
```

### 5.3 Propensity Engine Tests

```typescript
// tests/lib/propensity-engine.test.ts
import { describe, it, expect } from 'vitest'
import { propensityEngine } from '@/lib/propensity-engine'

describe('PropensityEngine', () => {
  describe('calculateScores', () => {
    it('should return higher payment score for small amounts', async () => {
      const smallDebt = await propensityEngine.calculateScores({
        id: '1',
        amount: 300,
        daysOverdue: 10,
      })

      const largeDebt = await propensityEngine.calculateScores({
        id: '2',
        amount: 5000,
        daysOverdue: 10,
      })

      expect(smallDebt.paymentScore).toBeGreaterThan(largeDebt.paymentScore)
    })

    it('should return higher loan score for high risk customers', async () => {
      const result = await propensityEngine.calculateScores({
        id: '1',
        amount: 3000,
        daysOverdue: 100,
        classification: 'high_risk',
      })

      expect(result.loanScore).toBeGreaterThan(30)
    })

    it('should include factors explaining the score', async () => {
      const result = await propensityEngine.calculateScores({
        id: '1',
        amount: 300,
        daysOverdue: 10,
      })

      expect(result.factors).toBeInstanceOf(Array)
      expect(result.factors.length).toBeGreaterThan(0)
    })

    it('should calculate confidence based on available data', async () => {
      const withHistory = await propensityEngine.calculateScores({
        id: '1',
        amount: 1000,
        daysOverdue: 30,
        customerHistory: {
          totalDebts: 5,
          paidDebts: 4,
          avgPaymentDelay: 5,
        },
        classification: 'medium',
      })

      const withoutHistory = await propensityEngine.calculateScores({
        id: '2',
        amount: 1000,
        daysOverdue: 30,
      })

      expect(withHistory.confidence).toBeGreaterThan(withoutHistory.confidence)
    })
  })
})
```

### 5.4 Document Validation Tests

```typescript
// tests/lib/import-utils.test.ts
import { describe, it, expect } from 'vitest'
import { validateCPF, validateCNPJ, validateEmail } from '@/lib/import-utils'

describe('Document Validation', () => {
  describe('validateCPF', () => {
    it('should validate correct CPF', () => {
      expect(validateCPF('529.982.247-25')).toBe(true)
      expect(validateCPF('52998224725')).toBe(true)
    })

    it('should reject invalid CPF', () => {
      expect(validateCPF('111.111.111-11')).toBe(false) // All same digits
      expect(validateCPF('123.456.789-00')).toBe(false) // Invalid check digits
      expect(validateCPF('12345')).toBe(false) // Too short
    })
  })

  describe('validateCNPJ', () => {
    it('should validate correct CNPJ', () => {
      expect(validateCNPJ('11.444.777/0001-61')).toBe(true)
      expect(validateCNPJ('11444777000161')).toBe(true)
    })

    it('should reject invalid CNPJ', () => {
      expect(validateCNPJ('11.111.111/1111-11')).toBe(false)
      expect(validateCNPJ('12345678901234')).toBe(false)
    })
  })

  describe('validateEmail', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name@domain.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('missing@domain')).toBe(false)
      expect(validateEmail('@nodomain.com')).toBe(false)
    })
  })
})
```

### 5.5 Component Test Examples

```typescript
// tests/components/customer-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CustomerForm } from '@/components/customer-form'

describe('CustomerForm', () => {
  it('should render all form fields', () => {
    render(<CustomerForm onSubmit={vi.fn()} />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cpf/i)).toBeInTheDocument()
  })

  it('should show validation errors for empty required fields', async () => {
    render(<CustomerForm onSubmit={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText(/name must be at least/i)).toBeInTheDocument()
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
  })

  it('should call onSubmit with valid data', async () => {
    const onSubmit = vi.fn()
    render(<CustomerForm onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'John Doe' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'john@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/cpf/i), {
      target: { value: '52998224725' },
    })

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        phone: undefined,
        document: '52998224725',
      })
    })
  })
})
```

---

## 6. Setting Up Automated Tests

### Install Testing Dependencies

```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitejs/plugin-react
```

### Create Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

### Create Test Setup

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}))
```

### Add Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

### Run Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui
```

---

## Testing Checklist

### Before Deployment

- [ ] All manual test cases pass
- [ ] API endpoints return correct responses
- [ ] Authentication flow works
- [ ] Collection rules execute correctly
- [ ] Webhook handlers process events
- [ ] Email/SMS notifications send
- [ ] Payment flow completes
- [ ] Role-based access enforced

### Smoke Tests (Production)

- [ ] Homepage loads
- [ ] Login works
- [ ] Dashboard loads data
- [ ] Can create/edit/delete records
- [ ] Cron jobs execute
- [ ] Webhooks receive events
