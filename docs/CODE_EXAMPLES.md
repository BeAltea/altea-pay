# Altea Pay - Code Examples

> Ready-to-use code snippets for common operations.

---

## Table of Contents

1. [Database Operations](#1-database-operations)
2. [Authentication](#2-authentication)
3. [API Routes](#3-api-routes)
4. [Server Actions](#4-server-actions)
5. [React Components](#5-react-components)
6. [Form Handling](#6-form-handling)
7. [Business Logic](#7-business-logic)
8. [Integrations](#8-integrations)

---

## 1. Database Operations

### Basic CRUD Operations

\`\`\`typescript
import { createClient } from "@/lib/supabase/server"

// CREATE
async function createCustomer(data: CustomerInput) {
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      name: data.name,
      email: data.email,
      document: data.document.replace(/\D/g, ''),
      document_type: data.document.length === 11 ? 'cpf' : 'cnpj',
      company_id: data.company_id,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return customer
}

// READ - Single
async function getCustomerById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

// READ - List with pagination
async function getCustomers(companyId: string, page = 1, pageSize = 20) {
  const supabase = await createClient()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw new Error(error.message)
  return { data, count, page, pageSize }
}

// UPDATE
async function updateCustomer(id: string, data: Partial<Customer>) {
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return customer
}

// DELETE
async function deleteCustomer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
}
\`\`\`

### Queries with Joins

\`\`\`typescript
// Get customers with their debts
async function getCustomersWithDebts(companyId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select(`
      id,
      name,
      email,
      phone,
      document,
      debts (
        id,
        original_amount,
        current_amount,
        due_date,
        status,
        classification
      )
    `)
    .eq('company_id', companyId)
    .order('name')

  return data
}

// Get debt with customer and company info
async function getDebtDetails(debtId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('debts')
    .select(`
      *,
      customer:customers (
        id,
        name,
        email,
        phone,
        document
      ),
      company:companies (
        id,
        name
      ),
      payments (
        id,
        amount,
        payment_date,
        payment_method
      )
    `)
    .eq('id', debtId)
    .single()

  return data
}
\`\`\`

### Complex Filters

\`\`\`typescript
// Get overdue debts for collection
async function getOverdueDebtsForCollection(companyId: string) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('debts')
    .select('*, customers(*)')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .lt('due_date', today)
    .not('customers.email', 'is', null)
    .order('days_overdue', { ascending: false })

  return data
}

// Search with multiple conditions
async function searchDebts(params: {
  companyId: string
  status?: string
  minAmount?: number
  maxAmount?: number
  startDate?: string
  endDate?: string
}) {
  const supabase = await createClient()

  let query = supabase
    .from('debts')
    .select('*, customers(name, email)')
    .eq('company_id', params.companyId)

  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.minAmount) {
    query = query.gte('current_amount', params.minAmount)
  }
  if (params.maxAmount) {
    query = query.lte('current_amount', params.maxAmount)
  }
  if (params.startDate) {
    query = query.gte('due_date', params.startDate)
  }
  if (params.endDate) {
    query = query.lte('due_date', params.endDate)
  }

  const { data, error } = await query.order('due_date')
  return data
}
\`\`\`

### Aggregations

\`\`\`typescript
// Get debt statistics
async function getDebtStats(companyId: string) {
  const supabase = await createClient()

  // Total by status
  const { data: byStatus } = await supabase
    .from('debts')
    .select('status, current_amount.sum()')
    .eq('company_id', companyId)

  // Use RPC for complex aggregations
  const { data: stats } = await supabase.rpc('get_debt_statistics', {
    p_company_id: companyId
  })

  return stats
}

// Count records
async function countOverdueDebts(companyId: string) {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('debts')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .lt('due_date', new Date().toISOString().split('T')[0])

  return count ?? 0
}
\`\`\`

---

## 2. Authentication

### Check Current User

\`\`\`typescript
// In Server Component
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id, full_name')
    .eq('id', user.id)
    .single()

  return (
    <div>
      <h1>Welcome, {profile?.full_name}</h1>
      <p>Role: {profile?.role}</p>
    </div>
  )
}
\`\`\`

### Client-side Auth Hook

\`\`\`typescript
// hooks/use-auth.tsx
"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        fetchProfile(user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
\`\`\`

### Sign In / Sign Up

\`\`\`typescript
// Sign in with email/password
async function signIn(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// Sign up new user
async function signUp(email: string, password: string, metadata?: any) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata, // { full_name: 'John Doe' }
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  if (error) throw error
  return data
}

// Password reset
async function resetPassword(email: string) {
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw error
}
\`\`\`

---

## 3. API Routes

### Basic API Route

\`\`\`typescript
// app/api/customers/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Fetch data
    const { data, error, count } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    // Create
    const { data, error } = await supabase
      .from('customers')
      .insert(body)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
\`\`\`

### Dynamic Route

\`\`\`typescript
// app/api/customers/[id]/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*, debts(*)')
    .eq('id', params.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('customers')
    .update(body)
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
\`\`\`

### Cron Job Route

\`\`\`typescript
// app/api/cron/daily-report/route.ts
import { createAdminClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  try {
    // Your cron job logic here
    const { data: stats } = await supabase.rpc('generate_daily_stats')

    console.log('[Cron] Daily report generated:', stats)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
    })
  } catch (error: any) {
    console.error('[Cron] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
\`\`\`

---

## 4. Server Actions

### Basic Server Action

\`\`\`typescript
// app/actions/customer-actions.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  document: z.string().min(11, 'Invalid document'),
})

export async function createCustomer(formData: FormData) {
  const supabase = await createClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Get user's company
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  // Parse and validate
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    document: formData.get('document'),
  }

  const validated = customerSchema.safeParse(rawData)
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.flatten().fieldErrors,
    }
  }

  // Insert
  const { data, error } = await supabase
    .from('customers')
    .insert({
      ...validated.data,
      company_id: profile?.company_id,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Revalidate cache
  revalidatePath('/dashboard/customers')

  return { success: true, data }
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/customers')
  return { success: true }
}
\`\`\`

### Action with File Upload

\`\`\`typescript
"use server"

import { createClient } from "@/lib/supabase/server"

export async function uploadFile(formData: FormData) {
  const supabase = await createClient()

  const file = formData.get('file') as File
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  // Validate file
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { success: false, error: 'File too large' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'Invalid file type' }
  }

  // Upload to Supabase Storage
  const fileName = `${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage
    .from('uploads')
    .upload(fileName, file)

  if (error) {
    return { success: false, error: error.message }
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(fileName)

  return { success: true, url: publicUrl }
}
\`\`\`

---

## 5. React Components

### Data Table Component

\`\`\`typescript
// components/data-table.tsx
"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface DataTableProps<T> {
  data: T[]
  columns: {
    key: keyof T
    header: string
    render?: (value: any, row: T) => React.ReactNode
  }[]
  onRowClick?: (row: T) => void
  actions?: (row: T) => React.ReactNode
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={String(col.key)}>{col.header}</TableHead>
          ))}
          {actions && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.id}
            onClick={() => onRowClick?.(row)}
            className={onRowClick ? "cursor-pointer hover:bg-muted" : ""}
          >
            {columns.map((col) => (
              <TableCell key={String(col.key)}>
                {col.render
                  ? col.render(row[col.key], row)
                  : String(row[col.key] ?? '')}
              </TableCell>
            ))}
            {actions && (
              <TableCell onClick={(e) => e.stopPropagation()}>
                {actions(row)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// Usage:
/*
<DataTable
  data={customers}
  columns={[
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'created_at',
      header: 'Created',
      render: (value) => new Date(value).toLocaleDateString(),
    },
  ]}
  onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
  actions={(customer) => (
    <Button variant="ghost" size="sm">Edit</Button>
  )}
/>
*/
\`\`\`

### Loading Skeleton

\`\`\`typescript
// components/customer-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"

export function CustomerListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <Skeleton className="h-8 w-[80px]" />
        </div>
      ))}
    </div>
  )
}

// Usage with Suspense:
/*
<Suspense fallback={<CustomerListSkeleton />}>
  <CustomerList />
</Suspense>
*/
\`\`\`

### Confirmation Dialog

\`\`\`typescript
// components/confirm-dialog.tsx
"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description: string
  onConfirm: () => Promise<void>
  confirmText?: string
  cancelText?: string
  variant?: "default" | "destructive"
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={variant === "destructive" ? "bg-destructive" : ""}
          >
            {loading ? "Loading..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// Usage:
/*
<ConfirmDialog
  trigger={<Button variant="destructive">Delete</Button>}
  title="Delete Customer?"
  description="This action cannot be undone."
  onConfirm={async () => await deleteCustomer(id)}
  confirmText="Delete"
  variant="destructive"
/>
*/
\`\`\`

---

## 6. Form Handling

### Form with React Hook Form + Zod

\`\`\`typescript
// components/customer-form.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  document: z.string().min(11, "Invalid CPF/CNPJ"),
})

type FormData = z.infer<typeof schema>

interface CustomerFormProps {
  initialData?: FormData
  onSubmit: (data: FormData) => Promise<void>
}

export function CustomerForm({ initialData, onSubmit }: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  })

  async function handleFormSubmit(data: FormData) {
    try {
      await onSubmit(data)
      toast.success("Customer saved successfully")
      reset()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="Customer name"
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder="email@example.com"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          {...register("phone")}
          placeholder="+55 11 99999-9999"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document">CPF/CNPJ</Label>
        <Input
          id="document"
          {...register("document")}
          placeholder="000.000.000-00"
        />
        {errors.document && (
          <p className="text-sm text-destructive">{errors.document.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  )
}
\`\`\`

---

## 7. Business Logic

### Debt Classification

\`\`\`typescript
import { ClassificationEngine } from "@/lib/classification-engine"

function classifyDebt(debt: Debt) {
  const engine = new ClassificationEngine()

  const result = engine.classify({
    daysOverdue: debt.days_overdue,
    amount: debt.current_amount,
    customerHistory: {
      previousPayments: debt.customer?.payment_count || 0,
      averageDelayDays: debt.customer?.avg_delay_days || 0,
      totalDebts: debt.customer?.total_debts || 1,
    },
  })

  return result
  // { classification: 'medium', appliedRule: '...', score: 75 }
}
\`\`\`

### Propensity Scoring

\`\`\`typescript
import { propensityEngine } from "@/lib/propensity-engine"

async function scoreDebt(debt: Debt) {
  const scores = await propensityEngine.calculateScores({
    id: debt.id,
    amount: debt.current_amount,
    daysOverdue: debt.days_overdue,
    customerHistory: {
      totalDebts: 5,
      paidDebts: 3,
      avgPaymentDelay: 15,
    },
    classification: debt.classification,
  })

  return scores
  // {
  //   paymentScore: 65,
  //   loanScore: 40,
  //   confidence: 80,
  //   factors: ['Atraso recente - alta propensão ao pagamento']
  // }
}
\`\`\`

### Credit Decision

\`\`\`typescript
import { decidirEntradaRegua } from "@/lib/credit-analysis-engine"

async function evaluateCustomer(creditData: any, debtAmount: number) {
  const cliente = {
    creditScore: creditData.score,
    atrasos12m: creditData.delays_12m || 0,
    temAcaoJudicial: creditData.has_lawsuit || false,
    temProtesto: creditData.has_protest || false,
    temDividaAtiva: creditData.has_active_debt || false,
    atrasosCartao24m: creditData.card_delays_24m || 0,
    limitePresumido: creditData.credit_limit || 0,
    rendaPresumida: creditData.presumed_income || 0,
    valorDivida: debtAmount,
  }

  const result = await decidirEntradaRegua(cliente)

  return result
  // {
  //   decisao: 'ACEITA',
  //   motivo: 'R1_SCORE_ALTO',
  //   riskLevel: 'LOW',
  //   comportamento: 'BOM',
  //   autoCollectionEnabled: true
  // }
}
\`\`\`

---

## 8. Integrations

### Send Notification

\`\`\`typescript
import { sendEmail } from "@/lib/notifications/email"
import { sendSMS } from "@/lib/notifications/sms"

async function notifyCustomer(customer: Customer, debt: Debt) {
  const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL}/pay/${debt.id}`

  // Send email
  if (customer.email) {
    await sendEmail({
      to: customer.email,
      subject: 'Payment Reminder',
      html: `
        <h1>Hello ${customer.name}</h1>
        <p>You have a pending payment of R$ ${debt.current_amount.toFixed(2)}</p>
        <a href="${paymentLink}">Pay Now</a>
      `,
    })
  }

  // Send SMS
  if (customer.phone) {
    await sendSMS({
      to: customer.phone,
      body: `${customer.name}, your payment of R$ ${debt.current_amount.toFixed(2)} is due. Pay at: ${paymentLink}`,
    })
  }
}
\`\`\`

### Create Payment in ASAAS

\`\`\`typescript
import {
  createAsaasCustomer,
  createAsaasPayment,
  getAsaasCustomerByCpfCnpj,
} from "@/lib/asaas"

async function createPayment(customer: Customer, debt: Debt) {
  // Get or create ASAAS customer
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
    billingType: 'UNDEFINED',
    value: debt.current_amount,
    dueDate: new Date().toISOString().split('T')[0],
    description: `Debt payment - ${debt.id}`,
    externalReference: debt.id,
  })

  return {
    paymentId: payment.id,
    paymentUrl: payment.invoiceUrl,
    pixQrCode: payment.pixQrCodeUrl,
    boletoUrl: payment.bankSlipUrl,
  }
}
\`\`\`

### Run Credit Analysis

\`\`\`typescript
import { analyzeDetailedWithCache } from "@/services/assertivaService"

async function analyzeCustomer(cpf: string, companyId: string) {
  const result = await analyzeDetailedWithCache(cpf, companyId)

  if (!result.success) {
    throw new Error(result.error)
  }

  return {
    score: result.data.score_geral,
    creditScore: result.data.score_credito,
    recoveryScore: result.data.score_recupere,
    hasLawsuits: result.data.acoes?.total > 0,
    hasProtests: result.data.credito?.protestos?.length > 0,
    creditLimit: result.data.credito?.limite_presumido,
    presumedIncome: result.data.credito?.renda_presumida,
  }
}
\`\`\`
