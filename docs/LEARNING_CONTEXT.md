# Altea Pay - Comprehensive Learning Context

> **Document Version:** 1.0
> **Last Updated:** February 2026
> **Target Audience:** New developers, architects, and technical stakeholders

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Technical Architecture](#2-technical-architecture)
3. [Code Organization](#3-code-organization)
4. [Core Features Documentation](#4-core-features-documentation)
5. [Data Models](#5-data-models)
6. [API Documentation](#6-api-documentation)
7. [Business Logic](#7-business-logic)
8. [Security & Compliance](#8-security--compliance)
9. [Development Guide](#9-development-guide)
10. [Integration Points](#10-integration-points)
11. [Glossary](#11-glossary)

---

## 1. Executive Summary

### 1.1 Project Overview

**Altea Pay** is a full-stack **multi-tenant SaaS platform** for automated debt collection and credit recovery management. The platform uses AI-driven decision engines and behavioral data to intelligently orchestrate payment recovery through multiple channels.

**Product Name:** Altea Pay - Sistema de Cobrança Inteligente
**Primary Language:** Portuguese (Brazil)
**Regulatory Compliance:** ANEEL, BACEN, LGPD

### 1.2 Business Objectives

| Objective | Description |
|-----------|-------------|
| **Automate Collection** | Replace manual debt collection with intelligent, rules-based automation |
| **Increase Recovery Rates** | Use credit scoring and behavioral analysis to optimize collection strategies |
| **Multi-Channel Engagement** | Reach debtors via email, SMS, WhatsApp, and phone |
| **ERP Integration** | Seamlessly sync with enterprise systems (TOTVS, Sankhya, Omie) |
| **Self-Service Portal** | Enable debtors to view and pay their debts online |
| **Compliance** | Ensure LGPD data privacy and regulatory compliance |

### 1.3 Key Stakeholders

| Role | Responsibilities | System Access |
|------|------------------|---------------|
| **Super Admin** | Platform management, all companies | `/super-admin` |
| **Company Admin** | Company configuration, collection management | `/dashboard` |
| **Collection Operator** | Execute collection actions, customer contact | `/dashboard` |
| **Debtor (User)** | View debts, make payments, negotiate | `/user-dashboard` |

### 1.4 Key Metrics

- **Recovery Rate:** Percentage of debt successfully collected
- **Collection Efficiency:** Actions per successful recovery
- **Channel Performance:** Effectiveness of each communication channel
- **Average Recovery Time:** Days from debt creation to payment

---

## 2. Technical Architecture

### 2.1 System Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Super Admin  │  │ Company Admin│  │   Operator   │  │    Debtor    │    │
│  │   Browser    │  │   Browser    │  │   Browser    │  │   Browser    │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼─────────────────┼─────────────────┼─────────────────┼────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                           PRESENTATION LAYER                                 │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐  │
│  │                     Next.js 14 (App Router)                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  │/super-admin │  │ /dashboard  │  │/user-dashboard│ │   /auth     │   │  │
│  │  │(super_admin)│  │   (admin)   │  │   (user)    │  │  (public)   │   │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                     │                                        │
│  ┌──────────────────────────────────┴───────────────────────────────────┐   │
│  │                    Middleware (Auth + RBAC)                          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐  │
│  │                        Next.js API Routes                             │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐          │  │
│  │  │Collection │  │  Payment  │  │  Import   │  │  Reports  │          │  │
│  │  │   Rules   │  │ Webhooks  │  │   API     │  │    API    │          │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘          │  │
│  └──────────────────��────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                        Server Actions                                 │  │
│  │  Customer Actions │ Debt Actions │ Notification Actions │ Analysis   │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Cron Jobs (Vercel)                               │  │
│  │  sync-erp (6h) │ process-collection-rules (1h) │ process-ruler (1h)  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                                 │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐  │
│  │                         Decision Engines                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │  Propensity  │  │   Credit     │  │Classification│                │  │
│  │  │   Engine     │  │  Analysis    │  │   Engine     │                │  │
│  │  │  (ML-ready)  │  │   Engine     │  │              │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Collection Engines                               │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐                  │  │
│  │  │   Collection Engine  │  │ Collection Ruler     │                  │  │
│  │  │  (Score-based routing)│  │ (Customizable rules) │                  │  │
│  │  └──────────────────────┘  └──────────────────────┘                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Services                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │  Assertiva   │  │     ERP      │  │    Credit    │                │  │
│  │  │   Service    │  │  Integration │  │   Analysis   │                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                          DATA ACCESS LAYER                                   │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐  │
│  │                      Supabase Clients                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │   Browser    │  │    Server    │  │    Admin     │                │  │
│  │  │   Client     │  │    Client    │  │   Client     │                │  │
│  │  │  (anon key)  │  │(anon+cookies)│  │(service role)│                │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                          DATABASE LAYER                                      │
│  ┌─────────────────────────────────┴─────────────────────────────────────┐  │
│  │              Supabase PostgreSQL + Row Level Security                 │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐             │  │
│  │  │ profiles  │ │ companies │ │ customers │ │   debts   │             │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘             │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐             │  │
│  │  │ payments  │ │agreements │ │collection_│ │  credit_  │             │  │
│  │  │           │ │           │ │  rules    │ │ profiles  │             │  │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                       EXTERNAL INTEGRATIONS                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │    ASAAS     │  │  Assertiva   │  │   Resend     │  │   Twilio     │    │
│  │  (Payments)  │  │  (Credit)    │  │   (Email)    │  │ (SMS/WhatsApp)│    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │    TOTVS     │  │   Sankhya    │  │     Omie     │                      │
│  │    (ERP)     │  │    (ERP)     │  │    (ERP)     │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

### 2.2 Technology Stack

#### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2.35 | Full-stack React framework (App Router) |
| React | 19.x | UI component library |
| TypeScript | 5.x | Type-safe JavaScript |
| Tailwind CSS | 4.1.9 | Utility-first styling |
| shadcn/ui | Latest | Component library (Radix UI) |
| Recharts | 2.15.4 | Data visualization |
| React Hook Form | 7.60.0 | Form management |
| Zod | 3.25.67 | Schema validation |

#### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js API Routes | 14.2.35 | HTTP endpoints |
| Server Actions | Next.js 13+ | Type-safe mutations |
| Supabase | 2.57.4 | BaaS (Auth, Database, Storage) |
| Resend | 4.0.1 | Email delivery |
| Twilio | 5.3.5 | SMS/WhatsApp delivery |

#### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database (via Supabase) |
| Row Level Security | Multi-tenant data isolation |
| UUID | Primary key generation |

#### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Hosting, serverless functions, cron jobs |
| Supabase Cloud | Database, authentication, storage |

### 2.3 Design Patterns

| Pattern | Implementation | Location |
|---------|----------------|----------|
| **Layered Architecture** | Presentation → API → Business → Data | Entire codebase |
| **Multi-Tenant** | company_id + RLS policies | Database layer |
| **Repository Pattern** | Supabase client abstraction | `lib/supabase/` |
| **Strategy Pattern** | ERP connectors | `lib/integrations/erp/connectors/` |
| **Singleton** | Engine instances | `PropensityEngine.getInstance()` |
| **Factory** | Supabase client creation | `createClient()`, `createAdminClient()` |
| **Observer** | Auth state changes | `onAuthStateChange()` |
| **Template Method** | Message templates | Collection rule steps |

### 2.4 Scalability Considerations

| Aspect | Current Implementation | Scaling Path |
|--------|----------------------|--------------|
| **Database** | Supabase (managed PostgreSQL) | Supabase Pro/Enterprise |
| **Compute** | Vercel serverless | Auto-scales with traffic |
| **Cron Jobs** | Vercel Cron | Increase frequency if needed |
| **File Storage** | Supabase Storage | S3-compatible, auto-scales |
| **Multi-tenancy** | RLS policies | Efficient at scale |
| **Caching** | In-memory token cache | Redis for production |

---

## 3. Code Organization

### 3.1 Directory Structure

\`\`\`
altea-pay/
├── app/                          # Next.js App Router
│   ├── auth/                     # Authentication pages
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   ├── callback/            # OAuth callback
│   │   ├── verify-email/        # Email verification
│   │   ├── forgot-password/     # Password reset request
│   │   ├── reset-password/      # Password reset form
│   │   └── confirm/             # Email confirmation
│   │
│   ├── dashboard/                # Company admin dashboard
│   │   ├── clientes/            # Customer management
│   │   ├── debts/               # Debt management
│   │   ├── agreements/          # Payment agreements
│   │   ├── collection-rules/    # Collection rule config
│   │   ├── import/              # Data import
│   │   ├── reports/             # Company reports
│   │   ├── settings/            # Company settings
│   │   └── layout.tsx           # Dashboard layout
│   │
│   ├── super-admin/              # Platform admin area
│   │   ├── companies/           # Company management
│   │   ├── customers/           # All customers view
│   │   ├── users/               # User management
│   │   ├── analises/            # Credit analysis
│   │   ├── analytics/           # Platform analytics
│   │   ├── audit/               # Audit logs
│   │   └── layout.tsx           # Super admin layout
│   │
│   ├── user-dashboard/           # Debtor self-service
│   │   ├── debts/               # View debts
│   │   ├── payments/            # Payment history
│   │   ├── negotiations/        # Payment agreements
│   │   └── layout.tsx           # User layout
│   │
│   ├── api/                      # API Routes
│   │   ├── assertiva/           # Assertiva callbacks
│   │   ├── auth/                # Auth endpoints
│   │   ├── collection-rules/    # CRUD endpoints
│   │   ├── cron/                # Scheduled jobs
│   ��   │   ├── sync-erp/        # ERP synchronization
│   │   │   ├── process-collection-rules/
│   │   │   └── process-collection-ruler/
│   │   ├── import/              # Data import
│   │   ├── propensity/          # Scoring API
│   │   ├── reports/             # Report generation
│   │   ├── webhooks/            # External webhooks
│   │   │   └── asaas/           # Payment webhooks
│   │   └── ...
│   │
│   ├── actions/                  # Server Actions
│   │   ├── customer-actions.ts
│   │   ├── debt-actions.ts
│   │   ├── send-notification.ts
│   │   └── ...
│   │
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── globals.css               # Global styles
│
├── components/                   # React Components
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── ...                  # 30+ components
│   ├── dashboard/               # Admin dashboard components
│   ├── super-admin/             # Super admin components
│   ├── user-dashboard/          # User portal components
│   ├── auth/                    # Auth components
│   └── theme-provider.tsx       # Theme context
│
├── lib/                          # Core Libraries
│   ├── supabase/                # Supabase clients
│   │   ├── server.ts            # Server-side client
│   │   ├── client.ts            # Browser client
│   │   ├── admin.ts             # Admin client
│   │   └── middleware.ts        # Auth middleware
│   │
│   ├── integrations/            # External integrations
│   │   └── erp/                 # ERP integration
│   │       ├── erpService.ts    # Generic ERP service
│   │       ├── types.ts         # Type definitions
│   │       └── connectors/      # ERP-specific connectors
│   │           ├── index.ts
│   │           ├── totvs.ts
│   │           └── example-erp.ts
│   │
│   ├── notifications/           # Notification services
│   │   ├── email.tsx            # Resend integration
│   │   └── sms.tsx              # Twilio integration
│   │
│   ├── propensity-engine.ts     # AI propensity scoring
│   ├── credit-analysis-engine.ts # Credit decision logic
│   ├── credit-analysis-types.ts # Credit type definitions
│   ├── classification-engine.ts # Risk classification
│   ├── collection-engine.ts     # Collection automation
│   ├── collection-ruler-engine.ts # Customizable rules
│   ├── collection-rules.ts      # Rule client functions
│   ├── asaas.ts                 # ASAAS payment gateway
│   ├── asaas-integration.ts     # ASAAS helpers
│   ├── import-utils.ts          # Import/validation
│   ├── reports.ts               # Report generation
│   └── utils.ts                 # General utilities
│
├── services/                     # Business Services
│   ├── assertivaService.ts      # Assertiva credit API
│   ├── creditAnalysisService.ts # Credit analysis orchestration
│   └── erpIntegrationService.ts # ERP sync service
│
├── hooks/                        # React Hooks
│   ├── use-auth.tsx             # Auth context hook
│   └── use-toast.ts             # Toast notifications
│
├── scripts/                      # Database Scripts
│   ├── 001_create_database_schema.sql
│   ├── 002_setup_rls_policies.sql
│   └── ...                      # 100+ migration files
│
├── middleware.ts                 # Next.js middleware
├── next.config.mjs              # Next.js configuration
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies
├── vercel.json                  # Vercel deployment config
└── components.json              # shadcn/ui config
\`\`\`

### 3.2 Module Responsibilities

| Module | Responsibility | Key Exports |
|--------|----------------|-------------|
| `lib/supabase/` | Database access abstraction | `createClient()`, `createAdminClient()` |
| `lib/propensity-engine.ts` | Payment/loan propensity scoring | `PropensityEngine`, `calculateScores()` |
| `lib/credit-analysis-engine.ts` | Credit approval decisions | `decidirEntradaRegua()` |
| `lib/classification-engine.ts` | Debt risk classification | `ClassificationEngine`, `classify()` |
| `lib/collection-engine.ts` | Score-based collection routing | `processCollectionByScore()` |
| `lib/collection-ruler-engine.ts` | Customizable rule execution | `processCollectionRulers()` |
| `lib/notifications/` | Multi-channel messaging | `sendEmail()`, `sendSMS()` |
| `services/assertivaService.ts` | Assertiva API integration | `analyzeDetailedWithCache()` |
| `services/erpIntegrationService.ts` | ERP synchronization | `syncCustomers()`, `syncInvoices()` |

### 3.3 Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Files** | kebab-case | `collection-engine.ts` |
| **Components** | PascalCase | `CustomerCard.tsx` |
| **Functions** | camelCase | `calculateScores()` |
| **Constants** | SCREAMING_SNAKE | `SCORE_ALTO_MIN` |
| **Interfaces** | PascalCase with prefix | `AsaasPayment`, `ERPConnector` |
| **Types** | PascalCase | `RiskClassification` |
| **Database tables** | snake_case | `collection_rules` |
| **API routes** | kebab-case | `/api/collection-rules` |

### 3.4 Code Organization Principles

1. **Colocation:** Related files are kept together (e.g., page + components)
2. **Separation of Concerns:** UI, business logic, and data access are separate
3. **Single Responsibility:** Each module has one clear purpose
4. **Dependency Inversion:** Business logic depends on abstractions (interfaces)
5. **DRY:** Shared utilities in `lib/`, reusable components in `components/ui/`

---

## 4. Core Features Documentation

### 4.1 Authentication & Authorization

#### Business Purpose
Control access to the platform based on user roles and company membership.

#### Technical Implementation
- **Provider:** Supabase Auth (email/password, magic links)
- **Session:** JWT tokens in HTTP-only cookies
- **RBAC:** 3 roles enforced via middleware

#### Key Files
| File | Purpose |
|------|---------|
| `middleware.ts` | Route protection entry point |
| `lib/supabase/middleware.ts` | Auth logic and role routing |
| `hooks/use-auth.tsx` | Auth context provider |
| `app/auth/*` | Auth UI pages |

#### Role-Based Access

\`\`\`typescript
// Role definitions
type UserRole = "super_admin" | "admin" | "user"

// Route mapping
const roleRoutes = {
  super_admin: "/super-admin",
  admin: "/dashboard",
  user: "/user-dashboard"
}
\`\`\`

#### Configuration
Environment variables:
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

---

### 4.2 Credit Analysis Engine

#### Business Purpose
Determine if customers qualify for automated collection based on credit profile and behavior.

#### Technical Implementation
7-rule decision engine that evaluates credit score, behavior, income, and debt amount.

#### Key Files
| File | Purpose |
|------|---------|
| `lib/credit-analysis-engine.ts` | Decision logic |
| `lib/credit-analysis-types.ts` | Type definitions and config |
| `services/assertivaService.ts` | Assertiva API integration |
| `services/creditAnalysisService.ts` | Orchestration service |

#### Key Functions

\`\`\`typescript
// Main decision function
async function decidirEntradaRegua(cli: ClienteCredito): Promise<ResultadoRegra>

// Behavior classification
async function classificarComportamento(cli: ClienteCredito): Promise<Comportamento>

// Risk level determination
async function determinarRiskLevel(score: number): Promise<RiskLevel>
\`\`\`

#### Configuration

\`\`\`typescript
// lib/credit-analysis-types.ts
export const RegrasConfig = {
  SCORE_ALTO_MIN: 400,      // High score threshold
  SCORE_MEDIO_MIN: 300,     // Medium score threshold
  RENDA_MIN_OK: 2000,       // Minimum acceptable income
  RENDA_MIN_CRITICA: 1500,  // Critical income threshold
  LIMITE_MIN_OK: 300,       // Minimum credit limit
  DIVIDA_BAIXA_MAX: 1000,   // Small debt threshold
}
\`\`\`

#### Dependencies
- Assertiva API credentials
- Customer debt data

---

### 4.3 Collection Automation

#### Business Purpose
Automatically execute collection actions based on rules and customer risk profiles.

#### Technical Implementation
Two-engine system:
1. **Collection Engine:** Score-based routing (auto/assisted/manual)
2. **Collection Ruler Engine:** Customizable rule execution with templates

#### Key Files
| File | Purpose |
|------|---------|
| `lib/collection-engine.ts` | Score-based routing |
| `lib/collection-ruler-engine.ts` | Rule execution |
| `lib/collection-rules.ts` | Rule CRUD operations |
| `app/api/cron/process-collection-ruler/route.ts` | Scheduled execution |

#### Collection Modes

\`\`\`typescript
type CollectionMode =
  | "AUTO_MESSAGE"        // Score ≥ 294: Immediate email + SMS
  | "ASSISTED_COLLECTION" // Score 350-490 + good behavior: Operator review
  | "MANUAL_COLLECTION"   // Score < 294: Human intervention required
\`\`\`

#### Rule Step Configuration

\`\`\`typescript
interface CollectionRuleStep {
  days_after_due: number       // Trigger day (0 = due date)
  action_type: "email" | "sms" | "whatsapp" | "call_automatic" | "call_human" | "task"
  template_content: string     // Message with variables: {customer_name}, {amount}
  execution_time: string       // "09:00"
  is_enabled: boolean
  retry_on_failure: boolean
  max_retries: number
}
\`\`\`

#### Cron Schedule
- **Process collection rules:** Every hour (`0 * * * *`)
- **Process collection ruler:** Every hour (`0 * * * *`)

---

### 4.4 Payment Processing

#### Business Purpose
Enable customers to pay debts through multiple payment methods.

#### Technical Implementation
ASAAS payment gateway integration supporting PIX, boleto, and credit card.

#### Key Files
| File | Purpose |
|------|---------|
| `lib/asaas.ts` | ASAAS API client |
| `lib/asaas-integration.ts` | Payment link generation |
| `app/api/webhooks/asaas/route.ts` | Payment confirmation webhook |

#### Supported Methods

| Method | billingType | Features |
|--------|-------------|----------|
| PIX | `"PIX"` | Instant, QR code |
| Boleto | `"BOLETO"` | Bank slip PDF |
| Credit Card | `"CREDIT_CARD"` | Installments |
| Dynamic | `"UNDEFINED"` | Customer chooses |

#### Key Functions

\`\`\`typescript
// Create customer in ASAAS
createAsaasCustomer(params): Promise<AsaasCustomer>

// Create payment/invoice
createAsaasPayment(params): Promise<AsaasPayment>

// Generate payment link
createAsaasPaymentLink(data): Promise<AsaasPaymentLink>
\`\`\`

#### Configuration
\`\`\`env
ASAAS_API_KEY=your-asaas-api-key
ASAAS_API_URL=https://api.asaas.com/v3
\`\`\`

---

### 4.5 ERP Integration

#### Business Purpose
Synchronize customer and debt data with enterprise systems.

#### Technical Implementation
Connector pattern supporting multiple ERP systems with generic interface.

#### Key Files
| File | Purpose |
|------|---------|
| `services/erpIntegrationService.ts` | Sync orchestration |
| `lib/integrations/erp/erpService.ts` | Generic ERP service |
| `lib/integrations/erp/connectors/` | ERP-specific implementations |
| `app/api/cron/sync-erp/route.ts` | Scheduled sync |

#### Connector Interface

\`\`\`typescript
interface ERPConnector {
  name: string
  type: string
  testConnection(config: ERPConnectionConfig): Promise<boolean>
  fetchCustomers(config: ERPConnectionConfig): Promise<any[]>
  fetchDebts(config: ERPConnectionConfig): Promise<any[]>
  syncResults(config: ERPConnectionConfig, data: any[]): Promise<boolean>
}
\`\`\`

#### Supported ERPs
- TOTVS Protheus
- Sankhya
- Omie
- Generic REST API

#### Sync Schedule
Every 6 hours (`0 */6 * * *`)

---

### 4.6 Propensity Scoring

#### Business Purpose
Predict customer likelihood to pay or interest in loan/payment plans.

#### Technical Implementation
Rule-based scoring engine with ML-ready architecture.

#### Key Files
| File | Purpose |
|------|---------|
| `lib/propensity-engine.ts` | Scoring engine |
| `app/api/propensity/route.ts` | API endpoint |

#### Scoring Factors

| Factor | Payment Score Impact | Loan Score Impact |
|--------|---------------------|-------------------|
| Amount < R$500 | +20 | - |
| Amount > R$2,000 | -15 | +10 |
| Days overdue < 30 | +25 | - |
| Days overdue > 90 | -30 | +15 |
| Good payment history | +15 | - |
| Poor payment history | -20 | +20 |

#### Output

\`\`\`typescript
interface PropensityScores {
  paymentScore: number   // 0-100
  loanScore: number      // 0-100
  confidence: number     // Prediction quality
  factors: string[]      // Reasoning
}
\`\`\`

---

### 4.7 Risk Classification

#### Business Purpose
Categorize debts by risk level for prioritization.

#### Technical Implementation
Priority-based rule engine with customizable rules.

#### Key Files
| File | Purpose |
|------|---------|
| `lib/classification-engine.ts` | Classification logic |
| `app/api/classify/route.ts` | API endpoint |

#### Risk Levels

| Level | Criteria | Recommended Action |
|-------|----------|-------------------|
| **Critical** | >90 days OR (>60 days AND >R$5,000) | Legal action |
| **High** | 60-90 days OR poor history | Phone call |
| **Medium** | 30-60 days OR high value | Email + SMS |
| **Low** | <30 days | Email reminder |

---

### 4.8 Data Import

#### Business Purpose
Bulk import customers and debts from CSV/XLSX files.

#### Technical Implementation
Server-side parsing with validation and error reporting.

#### Key Files
| File | Purpose |
|------|---------|
| `lib/import-utils.ts` | Parsing and validation |
| `app/api/import/route.ts` | Import endpoint |
| `app/actions/import-data.ts` | Server action |

#### Validation Functions

\`\`\`typescript
validateEmail(email: string): boolean
validateCPF(cpf: string): boolean
validateCNPJ(cnpj: string): boolean
validateCustomerRecord(record, lineNumber): ImportValidationError[]
validateDebtRecord(record, lineNumber): ImportValidationError[]
\`\`\`

#### Supported Formats
- CSV (comma, semicolon, tab delimited)
- XLSX (Excel)
- JSON
- XML

---

## 5. Data Models

### 5.1 Entity Relationship Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ENTITY RELATIONSHIPS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────┐         ┌───────────┐         ┌───────────┐                 │
│  │ companies │ 1 ────< │ profiles  │         │auth.users │                 │
│  │           │         │           │ 1 ────1 │           │                 │
│  └─────┬─────┘         └───────────┘         └───────────┘                 │
│        │                                                                    │
│        │ 1                                                                  │
│        │                                                                    │
│        ▼ *                                                                  │
│  ┌───────────┐         ┌───────────┐                                       │
│  │ customers │ 1 ────< │   debts   │                                       │
│  │           │         │           │                                       │
│  └─────┬─────┘         └─────┬─────┘                                       │
│        │                     │                                              │
│        │ 1                   │ 1                                            │
│        │                     │                                              │
│        ▼ 1                   ├─────────────────┬─────────────────┐         │
│  ┌───────────┐               ▼ *               ▼ *               ▼ *       │
│  │  credit_  │         ┌───────────┐     ┌───────────┐     ┌───────────┐   │
│  │ profiles  │         │ payments  │     │agreements │     │collection_│   │
│  └───────────┘         └───────────┘     └───────────┘     │  actions  │   │
│                                                            └───────────┘   │
│                                                                             │
│  ┌───────────┐         ┌───────────┐                                       │
│  │collection_│ 1 ────< │collection_│                                       │
│  │   rules   │         │rule_steps │                                       │
│  └───────────┘         └───────────┘                                       │
│                                                                             │
│  ┌───────────┐         ┌───────────┐                                       │
│  │   erp_    │ 1 ────< │integration│                                       │
│  │integrations│        │   _logs   │                                       │
│  └───────────┘         └───────────┘                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
  1 ────< *  = One-to-Many
  1 ────1    = One-to-One
\`\`\`

### 5.2 Core Tables

#### profiles
\`\`\`sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'user')),
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### companies
\`\`\`sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document TEXT,           -- CNPJ
  settings JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### customers
\`\`\`sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document TEXT,           -- CPF/CNPJ
  document_type TEXT,      -- 'cpf' or 'cnpj'
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  external_id TEXT,        -- ERP reference
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### debts
\`\`\`sql
CREATE TABLE debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  original_amount DECIMAL(10,2) NOT NULL,
  current_amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  contract_number TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_collection', 'paid', 'written_off', 'in_agreement')),
  classification TEXT
    CHECK (classification IN ('low', 'medium', 'high', 'critical')),
  days_overdue INTEGER GENERATED ALWAYS AS (CURRENT_DATE - due_date) STORED,
  propensity_payment_score DECIMAL(5,2),
  propensity_loan_score DECIMAL(5,2),
  asaas_payment_id TEXT,
  payment_link TEXT,
  pix_qr_code_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### payments
\`\`\`sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id UUID NOT NULL REFERENCES debts(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT,     -- 'pix', 'boleto', 'credit_card'
  transaction_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### collection_rules
\`\`\`sql
CREATE TABLE collection_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  execution_mode TEXT DEFAULT 'automatic',
  start_date_field TEXT DEFAULT 'due_date',
  requires_approval_status TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### collection_rule_steps
\`\`\`sql
CREATE TABLE collection_rule_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID NOT NULL REFERENCES collection_rules(id),
  step_order INTEGER NOT NULL,
  days_after_due INTEGER NOT NULL,
  action_type TEXT NOT NULL
    CHECK (action_type IN ('email', 'sms', 'whatsapp', 'call_automatic', 'call_human', 'task')),
  template_subject TEXT,
  template_content TEXT,
  execution_time TEXT DEFAULT '09:00',
  is_enabled BOOLEAN DEFAULT true,
  retry_on_failure BOOLEAN DEFAULT false,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

#### credit_profiles
\`\`\`sql
CREATE TABLE credit_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL,
  cpf TEXT NOT NULL,
  document_type TEXT,
  source TEXT DEFAULT 'assertiva',
  score_assertiva DECIMAL(6,2),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'very_high')),
  data_assertiva JSONB,
  has_sanctions BOOLEAN DEFAULT false,
  has_public_bonds BOOLEAN DEFAULT false,
  analysis_date TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

### 5.3 Key Data Structures

#### ClienteCredito (Credit Analysis Input)
\`\`\`typescript
interface ClienteCredito {
  creditScore: number          // Assertiva score (0-1000)
  atrasos12m: number           // Delays in last 12 months
  temAcaoJudicial: boolean     // Has lawsuits
  temProtesto: boolean         // Has protests
  temDividaAtiva: boolean      // Has active debts
  atrasosCartao24m: number     // Card delays in 24 months
  limitePresumido: number      // Presumed credit limit
  rendaPresumida: number       // Presumed income
  valorDivida: number          // Debt amount
}
\`\`\`

#### ResultadoRegra (Decision Output)
\`\`\`typescript
interface ResultadoRegra {
  decisao: "ACEITA" | "REJEITA" | "ACEITA_ESPECIAL"
  motivo: string               // Rule identifier (R1-R7)
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  comportamento: "BOM" | "RUIM"
  autoCollectionEnabled: boolean
}
\`\`\`

#### PropensityScores
\`\`\`typescript
interface PropensityScores {
  paymentScore: number         // 0-100
  loanScore: number            // 0-100
  confidence: number           // Prediction quality
  factors: string[]            // Explanation factors
}
\`\`\`

---

## 6. API Documentation

### 6.1 Endpoint Catalog

#### Authentication Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/auth/verify` | Verify email token | Public |

#### Customer & Debt Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/get-company-customers` | List company customers | Required |
| GET | `/api/get-user-debts` | Get user's debts | Required |
| GET | `/api/get-user-debts-list` | Paginated debt list | Required |
| GET | `/api/vmax-clientes` | VMAX debt view | Required |

#### Collection Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/collection-rules` | List rules | Required |
| POST | `/api/collection-rules` | Create rule | Required |
| GET | `/api/collection-rules/[id]` | Get rule | Required |
| PUT | `/api/collection-rules/[id]` | Update rule | Required |
| DELETE | `/api/collection-rules/[id]` | Delete rule | Required |

#### Analysis Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/classify` | Classify debts | Required |
| GET | `/api/classify` | Get classification stats | Required |
| POST | `/api/propensity` | Calculate propensity | Required |
| GET | `/api/propensity` | Get scores | Required |
| POST | `/api/score-check` | Check credit score | Required |

#### Import/Export Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/import` | Import CSV/XLSX | Required |
| GET | `/api/export-analysis-pdf` | Export analysis PDF | Required |
| GET | `/api/export-customer-pdf` | Export customer PDF | Required |

#### Report Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/reports/kpis` | Dashboard KPIs | Required |

#### Webhook Endpoints

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/webhooks/asaas` | ASAAS payment webhook | ASAAS signature |
| POST | `/api/assertiva/callback` | Assertiva async callback | Assertiva |

#### Cron Endpoints

| Method | Endpoint | Schedule | Auth |
|--------|----------|----------|------|
| GET | `/api/cron/sync-erp` | Every 6 hours | CRON_SECRET |
| GET | `/api/cron/process-collection-rules` | Every hour | CRON_SECRET |
| GET | `/api/cron/process-collection-ruler` | Every hour | CRON_SECRET |

### 6.2 Request/Response Formats

#### Create Collection Rule

**Request:**
\`\`\`http
POST /api/collection-rules
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "Standard Collection Rule",
  "description": "Default 30-day collection flow",
  "is_active": true,
  "execution_mode": "automatic",
  "steps": [
    {
      "days_after_due": 0,
      "action_type": "email",
      "template_subject": "Payment Reminder",
      "template_content": "Dear {customer_name}, your payment of {amount} is due today."
    },
    {
      "days_after_due": 7,
      "action_type": "sms",
      "template_content": "Reminder: {amount} payment overdue. Pay at: {payment_link}"
    }
  ]
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": "uuid-here",
  "name": "Standard Collection Rule",
  "description": "Default 30-day collection flow",
  "is_active": true,
  "execution_mode": "automatic",
  "company_id": "company-uuid",
  "created_at": "2025-02-02T10:00:00Z"
}
\`\`\`

#### Import Data

**Request:**
\`\`\`http
POST /api/import
Content-Type: multipart/form-data

file: <csv-file>
type: customers | debts
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "import_id": "uuid-here",
  "total_records": 100,
  "successful_records": 95,
  "failed_records": 5,
  "errors": [
    {
      "line": 23,
      "field": "email",
      "value": "invalid-email",
      "error": "Invalid email format"
    }
  ]
}
\`\`\`

### 6.3 Authentication Flow

\`\`\`
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │      │  Next.js    │      │  Supabase   │
│   Browser   │      │  Middleware │      │    Auth     │
└──────┬──────┘      └──────┬──────┘      └──────┬──────┘
       │                    │                    │
       │ 1. Request page    │                    │
       │ ──────────────────>│                    │
       │                    │                    │
       │                    │ 2. Check cookies   │
       │                    │ ──────────────────>│
       │                    │                    │
       │                    │ 3. Validate JWT    │
       │                    │ <──────────────────│
       │                    │                    │
       │                    │ 4. Get user profile│
       │                    │ ──────────────────>│
       │                    │                    │
       │                    │ 5. Return role     │
       │                    │ <──────────────────│
       │                    │                    │
       │ 6. Route based on role                  │
       │ <──────────────────│                    │
       │                    │                    │
\`\`\`

### 6.4 Integration Patterns

#### Server Action Pattern
\`\`\`typescript
// app/actions/customer-actions.ts
"use server"

export async function createCustomer(companyId: string, data: CustomerData) {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({ ...data, company_id: companyId })
    .select()
    .single()

  if (error) throw error
  return customer
}
\`\`\`

#### API Route Pattern
\`\`\`typescript
// app/api/collection-rules/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('collection_rules')
    .select('*, collection_rule_steps(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
\`\`\`

---

## 7. Business Logic

### 7.1 Payment Flow

\`\`\`
┌──────────────────────────���──────────────────────────────────────────────────┐
│                            PAYMENT FLOW                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                           │
│  │    Debt     │                                                           │
│  │   Created   │                                                           │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐     ┌─────────────┐                                       │
│  │   ASAAS     │────>│  Payment    │                                       │
│  │  Customer   │     │   Created   │                                       │
│  │   Check     │     │  (PIX/Boleto│                                       │
│  └─────────────┘     │  /Card)     │                                       │
│                      └──────┬──────┘                                       │
│                             │                                               │
│                             ▼                                               │
│                      ┌─────────────┐                                       │
│                      │  Payment    │                                       │
│                      │   Link      │                                       │
│                      │  Generated  │                                       │
│                      └──────┬──────┘                                       │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   Email     │     │    SMS      │     │  WhatsApp   │                   │
│  │  with link  │     │  with link  │     │  with link  │                   │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                   │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             │                                               │
│                             ▼                                               │
│                      ┌─────────────┐                                       │
│                      │  Customer   │                                       │
│                      │   Clicks    │                                       │
│                      │    Link     │                                       │
│                      └──────┬──────┘                                       │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │    PIX      │     │   Boleto    │     │Credit Card  │                   │
│  │  QR Code    │     │    PDF      │     │   Form      │                   │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                   │
│         │                   │                   │                          │
│         └───────────────────┼───────────────────┘                          │
│                             │                                               │
│                             ▼                                               │
│                      ┌─────────────┐                                       │
│                      │   ASAAS     │                                       │
│                      │  Processes  │                                       │
│                      │   Payment   │                                       │
│                      └──────┬──────┘                                       │
│                             │                                               │
│                             ▼                                               │
│                      ┌─────────────┐                                       │
│                      │  Webhook    │                                       │
│                      │  Callback   │                                       │
│                      └──────┬──────┘                                       │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   Update    │     │   Create    │     │   Notify    │                   │
│  │    Debt     │     │  Payment    │     │   Company   │                   │
│  │  Status     │     │   Record    │     │             │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

### 7.2 Collection Decision Flow

\`\`\`
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COLLECTION DECISION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                           │
│  │  New Debt   │                                                           │
│  │  or Trigger │                                                           │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Assertiva Credit Analysis                         │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │   Acoes   │  │  Credito  │  │  Recupere │  │Comportam. │        │   │
│  │  │  (Legal)  │  │  (Score)  │  │ (Recovery)│  │(Behavior) │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘        │   │
│  └──────────────────────────────────┬──────────────────────────────────┘   │
│                                     │                                       │
│                                     ▼                                       │
│                          ┌─────────────────┐                               │
│                          │ Calculate Score │                               │
│                          │   (Average)     │                               │
│                          └────────┬────────┘                               │
│                                   │                                         │
│         ┌─────────────────────────┼─────────────────────────┐              │
│         │                         │                         │              │
│         ▼                         ▼                         ▼              │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│  │ Score ≥ 400 │           │Score 300-399│           │ Score < 300 │       │
│  │    (LOW)    │           │  (MEDIUM)   │           │   (HIGH)    │       │
│  └──────┬──────┘           └──────┬──────┘           └──────┬──────┘       │
│         │                         │                         │              │
│         ▼                         ▼                         ▼              │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│  │     R1      │           │ Check       │           │ Check       │       │
│  │   ACCEPT    │           │ Behavior    │           │ Behavior    │       │
│  │    AUTO     │           └──────┬──────┘           └──────┬──────┘       │
│  └──────┬──────┘                  │                         │              │
│         │              ┌──────────┴──────────┐              │              │
│         │              │                     │              │              │
│         │              ▼                     ▼              │              │
│         │       ┌─────────────┐       ┌─────────────┐       │              │
│         │       │    GOOD     │       │    BAD      │       │              │
│         │       │  Behavior   │       │  Behavior   │       │              │
│         │       └──────┬──────┘       └──────┬──────┘       │              │
│         │              │                     │              │              │
│         │              ▼                     ▼              │              │
│         │       ┌─────────────┐       ┌─────────────┐       │              │
│         │       │     R2      │       │     R3      │       │              │
│         │       │   ACCEPT    │       │   REJECT    │       │              │
│         │       │  ASSISTED   │       │             │       │              │
│         │       └─────────────┘       └─────────────┘       │              │
│         │                                                   │              │
│         │              ┌────────────────────────────────────┘              │
│         │              │                                                   │
│         │              ▼                                                   │
│         │       ┌─────────────┐                                           │
│         │       │    GOOD     │       ┌─────────────┐                     │
│         │       │  Behavior   │──────>│     R4      │                     │
│         │       │  + Small    │       │   ACCEPT    │                     │
│         │       │    Debt     │       │   SPECIAL   │                     │
│         │       └─────────────┘       └─────────────┘                     │
│         │                                                                  │
│         ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     COLLECTION ACTION                                │   │
│  │                                                                      │   │
│  │  AUTO (R1)         ASSISTED (R2)         MANUAL (R4)    REJECT      │   │
│  │  ┌─────────┐       ┌─────────┐          ┌───���─────┐    ┌─────────┐  │   │
│  │  │Email+SMS│       │Operator │          │ Human   │    │ No      │  │   │
│  │  │Immediate│       │ Review  │          │Collector│    │ Action  │  │   │
│  │  └─────────┘       └─────────┘          └─────────┘    └─────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
\`\`\`

### 7.3 Segmentation Algorithm

\`\`\`typescript
// Segmentation is based on multiple factors:

// 1. Credit Score Segments
const scoreSegments = {
  LOW_RISK: score >= 400,      // Auto collection
  MEDIUM_RISK: score >= 300,   // Assisted collection
  HIGH_RISK: score < 300       // Manual collection
}

// 2. Behavior Segments
const behaviorSegments = {
  GOOD: atrasos12m === 0 && !temAcaoJudicial && !temProtesto,
  BAD: atrasos12m > 0 || temAcaoJudicial || temProtesto
}

// 3. Debt Age Segments
const ageSegments = {
  CURRENT: daysOverdue <= 0,
  RECENT: daysOverdue <= 30,
  MODERATE: daysOverdue <= 60,
  AGED: daysOverdue <= 90,
  CRITICAL: daysOverdue > 90
}

// 4. Amount Segments
const amountSegments = {
  SMALL: amount <= 1000,
  MEDIUM: amount <= 5000,
  LARGE: amount <= 10000,
  VERY_LARGE: amount > 10000
}
\`\`\`

### 7.4 Rules and Validations

#### Document Validation
\`\`\`typescript
// CPF validation (11 digits + check digits)
function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11) return false
  // Check digit algorithm...
}

// CNPJ validation (14 digits + check digits)
function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return false
  // Check digit algorithm...
}
\`\`\`

#### Business Rules
| Rule | Validation | Action |
|------|------------|--------|
| Minimum income | rendaPresumida >= 1500 | Reject if below |
| Minimum limit | limitePresumido >= 300 | Reject if below |
| Score threshold | creditScore >= 300 | Different collection modes |
| Behavior check | No delays, lawsuits, protests | Accept/Reject decision |
| Debt size | valorDivida <= 1000 | Special acceptance for small debts |

---

## 8. Security & Compliance

### 8.1 Security Measures

#### Authentication Security
| Measure | Implementation |
|---------|----------------|
| Password hashing | Supabase Auth (bcrypt) |
| JWT tokens | HTTP-only cookies |
| Session management | Automatic refresh |
| Email verification | Required for activation |
| Password reset | Secure token-based flow |

#### Authorization Security
| Measure | Implementation |
|---------|----------------|
| Role-based access | Middleware enforcement |
| Route protection | Per-path authorization |
| API protection | JWT validation |
| Cron protection | CRON_SECRET header |

#### Data Security
| Measure | Implementation |
|---------|----------------|
| Multi-tenant isolation | RLS policies |
| Input validation | Zod schemas |
| SQL injection prevention | Parameterized queries |
| XSS prevention | React auto-escaping |

### 8.2 LGPD Compliance Implementation

#### Data Subject Rights
| Right | Implementation |
|-------|----------------|
| Access | `/user-dashboard` self-service |
| Correction | Profile editing |
| Deletion | Account deletion request |
| Portability | Export functionality |

#### Data Processing
| Requirement | Implementation |
|-------------|----------------|
| Consent | Email verification |
| Purpose limitation | Role-based access |
| Data minimization | Only necessary fields |
| Accuracy | Validation on input |
| Storage limitation | Retention policies |
| Integrity | Audit logging |

#### Technical Measures
\`\`\`typescript
// Data anonymization for analytics
function anonymizeCustomer(customer: Customer) {
  return {
    ...customer,
    name: maskName(customer.name),
    email: maskEmail(customer.email),
    document: maskDocument(customer.document)
  }
}

// Audit logging
async function logAction(action: string, userId: string, data: any) {
  await supabase.from('audit_logs').insert({
    action,
    user_id: userId,
    data,
    ip_address: getClientIP(),
    timestamp: new Date()
  })
}
\`\`\`

### 8.3 Data Encryption and Tokenization

| Data Type | Protection |
|-----------|------------|
| Passwords | Hashed (bcrypt) |
| JWT tokens | Signed, HTTP-only cookies |
| API keys | Environment variables |
| Payment data | ASAAS PCI-compliant |
| Credit data | Assertiva encrypted transit |

### 8.4 Audit Trails

\`\`\`sql
-- Audit logging table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  company_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration logging
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_name TEXT,
  operation TEXT,
  request_data JSONB,
  response_data JSONB,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
\`\`\`

---

## 9. Development Guide

### 9.1 Setup Instructions

#### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Supabase CLI (optional for local development)

#### Installation

\`\`\`bash
# Clone repository
git clone https://github.com/BeAltea/altea-pay.git
cd altea-pay

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local

# Start development server
pnpm dev
\`\`\`

### 9.2 Environment Configuration

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ASAAS Payment Gateway
ASAAS_API_KEY=your-asaas-api-key
ASAAS_API_URL=https://api.asaas.com/v3

# Assertiva Credit Analysis
ASSERTIVA_CLIENT_ID=your-client-id
ASSERTIVA_CLIENT_SECRET=your-client-secret
ASSERTIVA_BASE_URL=https://api.assertivasolucoes.com.br
ASSERTIVA_CALLBACK_URL=https://your-domain.com/api/assertiva/callback

# Resend Email
RESEND_API_KEY=your-resend-api-key

# Twilio SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+15551234567

# Cron Jobs
CRON_SECRET=your-cron-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 9.3 Testing Approach

#### Manual Testing
\`\`\`bash
# Run development server
pnpm dev

# Test different roles
# Super Admin: super@alteapay.com
# Admin: admin@company.com
# User: user@email.com
\`\`\`

#### API Testing
\`\`\`bash
# Test with curl
curl -X GET http://localhost:3000/api/collection-rules \
  -H "Authorization: Bearer <jwt-token>"

# Test cron job
curl -X GET http://localhost:3000/api/cron/sync-erp \
  -H "Authorization: Bearer <CRON_SECRET>"
\`\`\`

### 9.4 Deployment Process

#### Vercel Deployment

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
\`\`\`

#### Environment Setup
1. Add all environment variables in Vercel dashboard
2. Configure cron jobs in `vercel.json`
3. Set up custom domain (optional)

#### Post-Deployment
1. Run database migrations
2. Verify cron jobs are running
3. Test webhook endpoints
4. Monitor error logs

---

## 10. Integration Points

### 10.1 External Services

| Service | Purpose | Documentation |
|---------|---------|---------------|
| **ASAAS** | Payment processing | https://docs.asaas.com |
| **Assertiva** | Credit analysis | Internal API docs |
| **Resend** | Email delivery | https://resend.com/docs |
| **Twilio** | SMS/WhatsApp | https://www.twilio.com/docs |
| **Supabase** | BaaS | https://supabase.com/docs |

### 10.2 Webhook Implementations

#### ASAAS Payment Webhook

\`\`\`typescript
// app/api/webhooks/asaas/route.ts
export async function POST(request: Request) {
  const data = await request.json()

  // Events: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE
  switch (data.event) {
    case 'PAYMENT_CONFIRMED':
    case 'PAYMENT_RECEIVED':
      await markDebtAsPaid(data.payment.externalReference)
      break
    case 'PAYMENT_OVERDUE':
      await triggerCollectionRule(data.payment.externalReference)
      break
  }

  return new Response('OK', { status: 200 })
}
\`\`\`

#### Assertiva Callback

\`\`\`typescript
// app/api/assertiva/callback/route.ts
export async function POST(request: Request) {
  const data = await request.json()

  // Store behavioral analysis results
  await supabase
    .from('credit_profiles')
    .upsert({
      cpf: data.documento,
      data_assertiva: data,
      score_assertiva: data.score,
      updated_at: new Date()
    })

  return new Response('OK', { status: 200 })
}
\`\`\`

### 10.3 Event Handling

#### Internal Events
| Event | Trigger | Handler |
|-------|---------|---------|
| Debt created | Import or manual | Trigger classification |
| Payment received | ASAAS webhook | Update debt status |
| Rule step due | Cron job | Execute collection action |
| Analysis complete | Assertiva callback | Update credit profile |

### 10.4 Error Handling Strategies

#### API Error Handling
\`\`\`typescript
try {
  const result = await externalApiCall()
  return NextResponse.json(result)
} catch (error) {
  console.error('[API Error]', error)

  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (error instanceof AuthenticationError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
\`\`\`

#### Retry Logic
\`\`\`typescript
// services/assertivaService.ts
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)
      if (response.ok) return response

      if (response.status === 401 && attempt < maxRetries) {
        // Refresh token and retry
        await refreshToken()
        continue
      }

      throw new Error(`HTTP ${response.status}`)
    } catch (error) {
      if (attempt === maxRetries) throw error
      await delay(1000 * attempt) // Exponential backoff
    }
  }
}
\`\`\`

---

## 11. Glossary

### 11.1 Technical Terms

| Term | Definition |
|------|------------|
| **App Router** | Next.js 13+ routing system using file-based routing in `/app` directory |
| **Server Components** | React components that render on the server (default in App Router) |
| **Server Actions** | Functions that run on the server, callable from client components |
| **RLS** | Row Level Security - PostgreSQL feature for row-based access control |
| **JWT** | JSON Web Token - compact, URL-safe means of representing claims |
| **SSR** | Server-Side Rendering - rendering pages on the server |
| **BaaS** | Backend as a Service - managed backend infrastructure |

### 11.2 Business Terminology

| Term (Portuguese) | Term (English) | Definition |
|-------------------|----------------|------------|
| **Régua de Cobrança** | Collection Rule | Automated sequence of collection actions |
| **Devedor** | Debtor | Customer who owes money |
| **Dívida** | Debt | Amount owed by a customer |
| **Acordo** | Agreement | Payment plan negotiated with debtor |
| **Cobrança Automática** | Auto Collection | Automated messaging without human intervention |
| **Cobrança Assistida** | Assisted Collection | Collection requiring operator review |
| **Propensão** | Propensity | Likelihood of customer behavior |
| **Classificação de Risco** | Risk Classification | Categorization of debt risk level |
| **Análise de Crédito** | Credit Analysis | Evaluation of customer creditworthiness |

### 11.3 Acronyms and Abbreviations

| Acronym | Full Form | Description |
|---------|-----------|-------------|
| **LGPD** | Lei Geral de Proteção de Dados | Brazilian data protection law |
| **ANEEL** | Agência Nacional de Energia Elétrica | Brazilian electricity regulatory agency |
| **BACEN** | Banco Central do Brasil | Brazilian central bank |
| **CPF** | Cadastro de Pessoas Físicas | Brazilian individual taxpayer ID |
| **CNPJ** | Cadastro Nacional da Pessoa Jurídica | Brazilian company taxpayer ID |
| **PIX** | Pagamento Instantâneo | Brazilian instant payment system |
| **ERP** | Enterprise Resource Planning | Business management software |
| **RLS** | Row Level Security | Database access control |
| **RBAC** | Role-Based Access Control | Authorization model |
| **KPI** | Key Performance Indicator | Business metric |
| **SaaS** | Software as a Service | Cloud software delivery model |

---

## Appendix A: Quick Reference Card

### Common Commands

\`\`\`bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm lint             # Run ESLint

# Database (Supabase CLI)
supabase start        # Start local Supabase
supabase db reset     # Reset database
supabase migration new # Create migration
\`\`\`

### Key Files Quick Reference

| Purpose | File |
|---------|------|
| Auth middleware | `lib/supabase/middleware.ts` |
| Credit scoring | `lib/credit-analysis-engine.ts` |
| Collection automation | `lib/collection-ruler-engine.ts` |
| Payment gateway | `lib/asaas.ts` |
| Email sending | `lib/notifications/email.tsx` |
| SMS sending | `lib/notifications/sms.tsx` |

### Role Access Quick Reference

| Path | super_admin | admin | user |
|------|-------------|-------|------|
| `/super-admin/*` | ✅ | ❌ | ❌ |
| `/dashboard/*` | ❌ | ✅ | ❌ |
| `/user-dashboard/*` | ❌ | ❌ | ✅ |
| `/auth/*` | ✅ | ✅ | ✅ |
| `/api/*` | Auth required | Auth required | Auth required |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 2026 | Claude (AI) | Initial comprehensive documentation |

---

*This document was generated based on codebase analysis. For the most up-to-date information, refer to the source code and inline documentation.*
