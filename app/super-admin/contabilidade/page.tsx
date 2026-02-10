"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Building2,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Calendar,
  FileSpreadsheet,
  FileText,
  Download,
  AlertCircle,
  Check,
  ArrowLeft,
  Calculator,
  Settings,
  Clock,
} from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

// Types
interface Company {
  id: string
  name: string
}

type RuleOperator = "=" | "<=" | ">=" | "entre"

interface SetupRule {
  id?: string
  min_days: number
  max_days: number | null
  profit_percentage: number
  sort_order: number
  operator: RuleOperator
}

interface Setup {
  id: string
  company_id: string
  name: string
  created_at: string
  rules: SetupRule[]
}

interface VmaxRecord {
  id: string
  id_company: string
  Cliente: string
  "CPF/CNPJ": string
  Vencido: string
  "Dias Inad.": string | number
  negotiation_status?: string
}

interface Agreement {
  id: string
  customer_id: string
  company_id: string
  status: string
  agreed_amount: number
  created_at: string
  payment_received_at?: string
}

interface ReportRow {
  clientName: string
  cpfCnpj: string
  debtAmount: number
  paidAmount: number
  paymentDate: string
  dueDate: string
  daysExpired: number
  ruleLabel: string
  profitPercentage: number
  alteapayProfit: number
  clientTransfer: number
}

type Step = "company" | "setup" | "setup-form" | "period" | "report"

type PeriodType = "yesterday" | "last-week" | "last-month" | "last-quarter" | "last-year" | "custom"

// Utilities
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("pt-BR")
}

function formatCpfCnpj(doc: string): string {
  const cleaned = doc.replace(/\D/g, "")
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  } else if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  }
  return doc
}

function parseVencido(value: string): number {
  const vencidoStr = String(value || "0")
  const cleanValue = vencidoStr.replace(/R\$/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
  return Number(cleanValue) || 0
}

function getRuleLabel(rule: SetupRule): string {
  switch (rule.operator) {
    case "=":
      return `= ${rule.min_days} dias`
    case "<=":
      return `<= ${rule.min_days} dias`
    case ">=":
      return `>= ${rule.min_days} dias`
    case "entre":
    default:
      if (rule.max_days === null) {
        return `>= ${rule.min_days} dias`
      }
      return `${rule.min_days}-${rule.max_days} dias`
  }
}

function getDateRange(periodType: PeriodType, customStart?: Date, customEnd?: Date): { start: Date; end: Date } {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  switch (periodType) {
    case "yesterday": {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)
      const end = new Date(yesterday)
      end.setHours(23, 59, 59, 999)
      return { start: yesterday, end }
    }
    case "last-week": {
      const end = new Date(now)
      end.setDate(end.getDate() - 1)
      const start = new Date(end)
      start.setDate(start.getDate() - 6)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case "last-month": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { start: lastMonth, end }
    }
    case "last-quarter": {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { start: threeMonthsAgo, end }
    }
    case "last-year": {
      const oneYearAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { start: oneYearAgo, end }
    }
    case "custom": {
      if (customStart && customEnd) {
        const start = new Date(customStart)
        start.setHours(0, 0, 0, 0)
        const end = new Date(customEnd)
        end.setHours(23, 59, 59, 999)
        return { start, end }
      }
      return { start: now, end: now }
    }
    default:
      return { start: now, end: now }
  }
}

export default function ContabilidadePage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  // Navigation state
  const [currentStep, setCurrentStep] = useState<Step>("company")
  const [loading, setLoading] = useState(true)

  // Data state
  const [companies, setCompanies] = useState<Company[]>([])
  const [setups, setSetups] = useState<Setup[]>([])
  const [setupCounts, setSetupCounts] = useState<Record<string, number>>({})

  // Selected state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [selectedSetup, setSelectedSetup] = useState<Setup | null>(null)
  const [editingSetup, setEditingSetup] = useState<Setup | null>(null)

  // Setup form state
  const [setupName, setSetupName] = useState("")
  const [setupRules, setSetupRules] = useState<SetupRule[]>([
    { min_days: 0, max_days: 120, profit_percentage: 10, sort_order: 0, operator: "entre" },
  ])
  const [formErrors, setFormErrors] = useState<string[]>([])

  // Period state
  const [periodType, setPeriodType] = useState<PeriodType>("last-month")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")

  // Report state
  const [reportData, setReportData] = useState<ReportRow[]>([])
  const [reportLoading, setReportLoading] = useState(false)

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [setupToDelete, setSetupToDelete] = useState<Setup | null>(null)

  // Fetch companies and setup counts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, name")
          .order("name")

        setCompanies(companiesData || [])

        // Get setup counts per company
        const { data: setupsData } = await supabase
          .from("accounting_setups")
          .select("id, company_id")

        const counts: Record<string, number> = {}
        for (const setup of setupsData || []) {
          counts[setup.company_id] = (counts[setup.company_id] || 0) + 1
        }
        setSetupCounts(counts)
      } catch (error) {
        console.error("[Contabilidade] Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [supabase])

  // Fetch setups when company is selected
  useEffect(() => {
    if (!selectedCompany) return

    const fetchSetups = async () => {
      const { data: setupsData } = await supabase
        .from("accounting_setups")
        .select("id, company_id, name, created_at")
        .eq("company_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      const setupsWithRules: Setup[] = []
      for (const setup of setupsData || []) {
        const { data: rulesData } = await supabase
          .from("accounting_setup_rules")
          .select("id, min_days, max_days, profit_percentage, sort_order, operator")
          .eq("setup_id", setup.id)
          .order("sort_order")

        setupsWithRules.push({
          ...setup,
          rules: rulesData || [],
        })
      }

      setSetups(setupsWithRules)
    }

    fetchSetups()
  }, [selectedCompany, supabase])

  // Navigation handlers
  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company)
    setCurrentStep("setup")
  }

  const handleBack = () => {
    switch (currentStep) {
      case "setup":
        setSelectedCompany(null)
        setCurrentStep("company")
        break
      case "setup-form":
        setEditingSetup(null)
        resetSetupForm()
        setCurrentStep("setup")
        break
      case "period":
        setSelectedSetup(null)
        setCurrentStep("setup")
        break
      case "report":
        setReportData([])
        setCurrentStep("period")
        break
    }
  }

  const resetSetupForm = () => {
    setSetupName("")
    setSetupRules([{ min_days: 0, max_days: 120, profit_percentage: 10, sort_order: 0, operator: "entre" }])
    setFormErrors([])
  }

  // Setup form handlers
  const handleNewSetup = () => {
    setEditingSetup(null)
    resetSetupForm()
    setCurrentStep("setup-form")
  }

  const handleEditSetup = (setup: Setup) => {
    setEditingSetup(setup)
    setSetupName(setup.name)
    // Add default operator for existing rules that don't have it
    const rulesWithOperator = setup.rules.map(r => ({
      ...r,
      operator: r.operator || "entre" as RuleOperator
    }))
    setSetupRules(rulesWithOperator.length > 0 ? rulesWithOperator : [{ min_days: 0, max_days: 120, profit_percentage: 10, sort_order: 0, operator: "entre" }])
    setCurrentStep("setup-form")
  }

  const handleDeleteSetup = (setup: Setup) => {
    setSetupToDelete(setup)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteSetup = async () => {
    if (!setupToDelete) return

    await supabase.from("accounting_setups").delete().eq("id", setupToDelete.id)

    setSetups(setups.filter((s) => s.id !== setupToDelete.id))
    setDeleteDialogOpen(false)
    setSetupToDelete(null)
  }

  const handleAddRule = () => {
    const lastRule = setupRules[setupRules.length - 1]
    const newMinDays = lastRule.max_days !== null ? lastRule.max_days + 1 : lastRule.min_days + 60
    setSetupRules([
      ...setupRules,
      {
        min_days: newMinDays,
        max_days: null,
        profit_percentage: 20,
        sort_order: setupRules.length,
        operator: "entre",
      },
    ])
  }

  const handleRemoveRule = (index: number) => {
    if (setupRules.length <= 1) return
    setSetupRules(setupRules.filter((_, i) => i !== index))
  }

  const handleRuleChange = (index: number, field: keyof SetupRule, value: number | null | string) => {
    const newRules = [...setupRules]
    newRules[index] = { ...newRules[index], [field]: value }
    setSetupRules(newRules)
  }

  const validateSetupForm = (): boolean => {
    const errors: string[] = []

    if (!setupName.trim()) {
      errors.push("Nome do setup e obrigatorio")
    }

    if (setupRules.length === 0) {
      errors.push("Pelo menos uma regra e obrigatoria")
    }

    for (let i = 0; i < setupRules.length; i++) {
      const rule = setupRules[i]
      if (rule.min_days < 0) {
        errors.push(`Regra ${i + 1}: Dias minimos deve ser >= 0`)
      }
      // Only validate max_days for "entre" operator
      if (rule.operator === "entre" && rule.max_days !== null && rule.max_days <= rule.min_days) {
        errors.push(`Regra ${i + 1}: Dias maximos deve ser maior que dias minimos`)
      }
      if (rule.profit_percentage < 0.01 || rule.profit_percentage > 100) {
        errors.push(`Regra ${i + 1}: Porcentagem deve estar entre 0.01 e 100`)
      }
    }

    // Check for overlaps
    for (let i = 0; i < setupRules.length; i++) {
      for (let j = i + 1; j < setupRules.length; j++) {
        const a = setupRules[i]
        const b = setupRules[j]
        const aMax = a.max_days ?? Infinity
        const bMax = b.max_days ?? Infinity

        if (
          (a.min_days <= b.min_days && b.min_days <= aMax) ||
          (b.min_days <= a.min_days && a.min_days <= bMax)
        ) {
          errors.push(`Regras ${i + 1} e ${j + 1} possuem intervalos sobrepostos`)
        }
      }
    }

    setFormErrors(errors)
    return errors.length === 0
  }

  const handleSaveSetup = async () => {
    if (!validateSetupForm() || !selectedCompany) return

    try {
      if (editingSetup) {
        // Update existing setup
        await supabase
          .from("accounting_setups")
          .update({ name: setupName })
          .eq("id", editingSetup.id)

        // Delete old rules
        await supabase
          .from("accounting_setup_rules")
          .delete()
          .eq("setup_id", editingSetup.id)

        // Insert new rules
        for (let i = 0; i < setupRules.length; i++) {
          const rule = setupRules[i]
          await supabase.from("accounting_setup_rules").insert({
            setup_id: editingSetup.id,
            min_days: rule.min_days,
            max_days: rule.max_days,
            profit_percentage: rule.profit_percentage,
            sort_order: i,
            operator: rule.operator,
          })
        }
      } else {
        // Create new setup
        const { data: newSetup } = await supabase
          .from("accounting_setups")
          .insert({
            company_id: selectedCompany.id,
            name: setupName,
          })
          .select()
          .single()

        if (newSetup) {
          // Insert rules
          for (let i = 0; i < setupRules.length; i++) {
            const rule = setupRules[i]
            await supabase.from("accounting_setup_rules").insert({
              setup_id: newSetup.id,
              min_days: rule.min_days,
              max_days: rule.max_days,
              profit_percentage: rule.profit_percentage,
              sort_order: i,
              operator: rule.operator,
            })
          }
        }
      }

      // Refresh setups
      const { data: setupsData } = await supabase
        .from("accounting_setups")
        .select("id, company_id, name, created_at")
        .eq("company_id", selectedCompany.id)
        .order("created_at", { ascending: false })

      const setupsWithRules: Setup[] = []
      for (const setup of setupsData || []) {
        const { data: rulesData } = await supabase
          .from("accounting_setup_rules")
          .select("id, min_days, max_days, profit_percentage, sort_order, operator")
          .eq("setup_id", setup.id)
          .order("sort_order")

        setupsWithRules.push({
          ...setup,
          rules: rulesData || [],
        })
      }
      setSetups(setupsWithRules)

      setEditingSetup(null)
      resetSetupForm()
      setCurrentStep("setup")
    } catch (error) {
      console.error("[Contabilidade] Error saving setup:", error)
      setFormErrors(["Erro ao salvar setup. Tente novamente."])
    }
  }

  const handleSelectSetup = (setup: Setup) => {
    setSelectedSetup(setup)
    setCurrentStep("period")
  }

  // Report generation
  const handleGenerateReport = async () => {
    if (!selectedCompany || !selectedSetup) return

    setReportLoading(true)
    setCurrentStep("report")

    try {
      const { start, end } = getDateRange(
        periodType,
        customStartDate ? new Date(customStartDate) : undefined,
        customEndDate ? new Date(customEndDate) : undefined
      )

      // Fetch VMAX data for this company
      let allVmax: VmaxRecord[] = []
      let page = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data: vmaxPage } = await supabase
          .from("VMAX")
          .select('id, id_company, Cliente, "CPF/CNPJ", Vencido, "Dias Inad.", negotiation_status')
          .eq("id_company", selectedCompany.id)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (vmaxPage && vmaxPage.length > 0) {
          allVmax = [...allVmax, ...vmaxPage]
          page++
          hasMore = vmaxPage.length === pageSize
        } else {
          hasMore = false
        }
      }

      // Fetch agreements (paid) for this company in the period
      const { data: agreementsData } = await supabase
        .from("agreements")
        .select("id, customer_id, company_id, status, agreed_amount, created_at, payment_received_at")
        .eq("company_id", selectedCompany.id)
        .in("status", ["completed", "paid"])
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())

      // Process data
      const rows: ReportRow[] = []

      for (const agreement of agreementsData || []) {
        // Find matching VMAX record
        const vmaxRecord = allVmax.find((v) => v.id === agreement.customer_id)

        if (!vmaxRecord) continue

        // Calculate days expired (from VMAX "Dias Inad.")
        const diasInadStr = String(vmaxRecord["Dias Inad."] || "0")
        const daysExpired = Number(diasInadStr.replace(/\./g, "")) || 0

        // Find matching rule based on operator
        let matchingRule = selectedSetup.rules.find((rule) => {
          switch (rule.operator) {
            case "=":
              return daysExpired === rule.min_days
            case "<=":
              return daysExpired <= rule.min_days
            case ">=":
              return daysExpired >= rule.min_days
            case "entre":
            default:
              if (rule.max_days === null) {
                return daysExpired >= rule.min_days
              }
              return daysExpired >= rule.min_days && daysExpired <= rule.max_days
          }
        })

        // Default to first rule if no match
        if (!matchingRule && selectedSetup.rules.length > 0) {
          matchingRule = selectedSetup.rules[0]
        }

        if (!matchingRule) continue

        const paidAmount = agreement.agreed_amount || 0
        const alteapayProfit = paidAmount * (matchingRule.profit_percentage / 100)
        const clientTransfer = paidAmount - alteapayProfit

        rows.push({
          clientName: vmaxRecord.Cliente || "N/A",
          cpfCnpj: formatCpfCnpj(vmaxRecord["CPF/CNPJ"] || ""),
          debtAmount: parseVencido(vmaxRecord.Vencido),
          paidAmount,
          paymentDate: formatDate(new Date(agreement.payment_received_at || agreement.created_at)),
          dueDate: "N/A", // Would need due date from VMAX
          daysExpired,
          ruleLabel: getRuleLabel(matchingRule),
          profitPercentage: matchingRule.profit_percentage,
          alteapayProfit,
          clientTransfer,
        })
      }

      setReportData(rows)
    } catch (error) {
      console.error("[Contabilidade] Error generating report:", error)
    } finally {
      setReportLoading(false)
    }
  }

  // Calculate summary
  const reportSummary = useMemo(() => {
    const byRule: Record<string, { count: number; received: number; alteapay: number; transfer: number }> = {}

    let totalReceived = 0
    let totalAlteapay = 0
    let totalTransfer = 0

    for (const row of reportData) {
      totalReceived += row.paidAmount
      totalAlteapay += row.alteapayProfit
      totalTransfer += row.clientTransfer

      if (!byRule[row.ruleLabel]) {
        byRule[row.ruleLabel] = { count: 0, received: 0, alteapay: 0, transfer: 0 }
      }
      byRule[row.ruleLabel].count++
      byRule[row.ruleLabel].received += row.paidAmount
      byRule[row.ruleLabel].alteapay += row.alteapayProfit
      byRule[row.ruleLabel].transfer += row.clientTransfer
    }

    return {
      totalPayments: reportData.length,
      totalReceived,
      totalAlteapay,
      totalTransfer,
      byRule,
    }
  }, [reportData])

  // Export functions
  const handleExportPDF = () => {
    if (!selectedCompany || !selectedSetup) return

    const doc = new jsPDF()
    const { start, end } = getDateRange(
      periodType,
      customStartDate ? new Date(customStartDate) : undefined,
      customEndDate ? new Date(customEndDate) : undefined
    )

    // Header
    doc.setFontSize(18)
    doc.text("AlteaPay - Relatorio de Contabilidade", 14, 20)

    doc.setFontSize(12)
    doc.text(`Empresa: ${selectedCompany.name}`, 14, 30)
    doc.text(`Setup: ${selectedSetup.name}`, 14, 37)
    doc.text(`Periodo: ${formatDate(start)} a ${formatDate(end)}`, 14, 44)

    // Table
    const tableData = reportData.map((row) => [
      row.clientName.substring(0, 20),
      row.cpfCnpj,
      formatBRL(row.paidAmount),
      row.daysExpired.toString(),
      row.ruleLabel,
      `${row.profitPercentage}%`,
      formatBRL(row.alteapayProfit),
      formatBRL(row.clientTransfer),
    ])

    autoTable(doc, {
      startY: 55,
      head: [["Cliente", "CPF/CNPJ", "Pago", "Dias", "Faixa", "%", "AlteaPay", "Repasse"]],
      body: tableData,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    })

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(12)
    doc.text("RESUMO", 14, finalY)

    doc.setFontSize(10)
    doc.text(`Total de Pagamentos: ${reportSummary.totalPayments}`, 14, finalY + 8)
    doc.text(`Valor Total Recebido: ${formatBRL(reportSummary.totalReceived)}`, 14, finalY + 15)
    doc.text(`LUCRO ALTEAPAY TOTAL: ${formatBRL(reportSummary.totalAlteapay)}`, 14, finalY + 22)
    doc.text(`REPASSE PARA ${selectedCompany.name.toUpperCase()}: ${formatBRL(reportSummary.totalTransfer)}`, 14, finalY + 29)

    // Footer
    doc.setFontSize(8)
    doc.text(`Gerado em ${formatDate(new Date())} por AlteaPay`, 14, doc.internal.pageSize.height - 10)

    doc.save(`contabilidade-${selectedCompany.name.toLowerCase().replace(/\s+/g, "-")}-${formatDate(start).replace(/\//g, "-")}.pdf`)
  }

  const handleExportXLSX = () => {
    if (!selectedCompany || !selectedSetup) return

    const { start, end } = getDateRange(
      periodType,
      customStartDate ? new Date(customStartDate) : undefined,
      customEndDate ? new Date(customEndDate) : undefined
    )

    // Sheet 1: Detail
    const detailData = reportData.map((row) => ({
      Cliente: row.clientName,
      "CPF/CNPJ": row.cpfCnpj,
      "Valor Divida": row.debtAmount,
      "Valor Pago": row.paidAmount,
      "Data Pagamento": row.paymentDate,
      "Dias Vencidos": row.daysExpired,
      Faixa: row.ruleLabel,
      "% AlteaPay": row.profitPercentage,
      "Lucro AlteaPay": row.alteapayProfit,
      "Repasse Cliente": row.clientTransfer,
    }))

    // Sheet 2: Summary
    const summaryData = [
      { Metrica: "Empresa", Valor: selectedCompany.name },
      { Metrica: "Setup", Valor: selectedSetup.name },
      { Metrica: "Periodo", Valor: `${formatDate(start)} a ${formatDate(end)}` },
      { Metrica: "", Valor: "" },
      { Metrica: "Total de Pagamentos", Valor: reportSummary.totalPayments },
      { Metrica: "Valor Total Recebido", Valor: reportSummary.totalReceived },
      { Metrica: "Lucro AlteaPay Total", Valor: reportSummary.totalAlteapay },
      { Metrica: `Repasse para ${selectedCompany.name}`, Valor: reportSummary.totalTransfer },
    ]

    const wb = XLSX.utils.book_new()

    const ws1 = XLSX.utils.json_to_sheet(detailData)
    XLSX.utils.book_append_sheet(wb, ws1, "Detalhamento")

    const ws2 = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws2, "Resumo")

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    saveAs(
      new Blob([wbout], { type: "application/octet-stream" }),
      `contabilidade-${selectedCompany.name.toLowerCase().replace(/\s+/g, "-")}-${formatDate(start).replace(/\//g, "-")}.xlsx`
    )
  }

  const handleExportCSV = () => {
    if (!selectedCompany) return

    const { start } = getDateRange(
      periodType,
      customStartDate ? new Date(customStartDate) : undefined,
      customEndDate ? new Date(customEndDate) : undefined
    )

    // UTF-8 BOM + semicolon separator for Brazilian locale
    const BOM = "\uFEFF"
    const headers = [
      "Cliente",
      "CPF/CNPJ",
      "Valor Divida",
      "Valor Pago",
      "Data Pagamento",
      "Dias Vencidos",
      "Faixa",
      "% AlteaPay",
      "Lucro AlteaPay",
      "Repasse Cliente",
    ].join(";")

    const rows = reportData.map((row) =>
      [
        `"${row.clientName}"`,
        row.cpfCnpj,
        row.debtAmount.toFixed(2).replace(".", ","),
        row.paidAmount.toFixed(2).replace(".", ","),
        row.paymentDate,
        row.daysExpired,
        row.ruleLabel,
        row.profitPercentage,
        row.alteapayProfit.toFixed(2).replace(".", ","),
        row.clientTransfer.toFixed(2).replace(".", ","),
      ].join(";")
    )

    const csv = BOM + headers + "\n" + rows.join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    saveAs(
      blob,
      `contabilidade-${selectedCompany.name.toLowerCase().replace(/\s+/g, "-")}-${formatDate(start).replace(/\//g, "-")}.csv`
    )
  }

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    const parts = ["Contabilidade"]
    if (selectedCompany) parts.push(selectedCompany.name)
    if (selectedSetup) parts.push(selectedSetup.name)
    if (currentStep === "report") {
      const { start, end } = getDateRange(
        periodType,
        customStartDate ? new Date(customStartDate) : undefined,
        customEndDate ? new Date(customEndDate) : undefined
      )
      parts.push(`${formatDate(start)} - ${formatDate(end)}`)
    }
    return parts
  }, [selectedCompany, selectedSetup, currentStep, periodType, customStartDate, customEndDate])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Contabilidade</h1>
          <p className="text-muted-foreground mt-1">Carregando...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {breadcrumb.map((part, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-4 w-4" />}
                <span className={i === breadcrumb.length - 1 ? "text-foreground font-medium" : ""}>
                  {part}
                </span>
              </span>
            ))}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Contabilidade</h1>
          <p className="text-muted-foreground mt-1">
            Gere relatorios de contabilidade com calculo de lucro por faixa de dias vencidos.
          </p>
        </div>
        {currentStep !== "company" && (
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        )}
      </div>

      {/* STEP 1: Company Selection */}
      {currentStep === "company" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <Card
              key={company.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleCompanySelect(company)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {setupCounts[company.id] || 0} setup(s) configurado(s)
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
          {companies.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma empresa cadastrada.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* STEP 2: Setup Selection */}
      {currentStep === "setup" && selectedCompany && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Setups de {selectedCompany.name}</h2>
            <Button onClick={handleNewSetup}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Setup
            </Button>
          </div>

          {setups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-4">
                  Nenhum setup configurado para {selectedCompany.name}
                </p>
                <Button onClick={handleNewSetup}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Setup
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {setups.map((setup) => (
                <Card key={setup.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{setup.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Criado em {formatDate(new Date(setup.created_at))}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditSetup(setup)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSetup(setup)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm font-medium text-muted-foreground">Regras ({setup.rules.length}):</p>
                      <div className="flex flex-wrap gap-2">
                        {setup.rules.map((rule, i) => (
                          <Badge key={i} variant="secondary">
                            {getRuleLabel(rule)}: {rule.profit_percentage}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => handleSelectSetup(setup)}>
                      Selecionar
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2B: Setup Form */}
      {currentStep === "setup-form" && (
        <Card>
          <CardHeader>
            <CardTitle>{editingSetup ? "Editar Setup" : "Novo Setup"}</CardTitle>
            <CardDescription>
              Configure as regras de porcentagem de lucro por faixa de dias vencidos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {formErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {formErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="setup-name">Nome do Setup</Label>
              <Input
                id="setup-name"
                placeholder="Ex: Contrato Padrao VMAX 2025"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Regras de Lucro</Label>
                <Button variant="outline" size="sm" onClick={handleAddRule}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Regra
                </Button>
              </div>

              {setupRules.map((rule, index) => (
                <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Operador</Label>
                      <Select
                        value={rule.operator}
                        onValueChange={(value) => handleRuleChange(index, "operator", value as RuleOperator)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Operador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entre">Entre</SelectItem>
                          <SelectItem value="=">=</SelectItem>
                          <SelectItem value="<=">{"<="}</SelectItem>
                          <SelectItem value=">=">{">="}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        {rule.operator === "entre" ? "Dias de" : "Dias"}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        value={rule.min_days}
                        onChange={(e) => handleRuleChange(index, "min_days", parseInt(e.target.value) || 0)}
                      />
                    </div>
                    {rule.operator === "entre" && (
                      <div className="space-y-1">
                        <Label className="text-xs">ate (vazio = sem limite)</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="∞"
                          value={rule.max_days ?? ""}
                          onChange={(e) =>
                            handleRuleChange(
                              index,
                              "max_days",
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">= AlteaPay %</Label>
                      <Input
                        type="number"
                        min="0.01"
                        max="100"
                        step="0.01"
                        value={rule.profit_percentage}
                        onChange={(e) =>
                          handleRuleChange(index, "profit_percentage", parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRule(index)}
                    disabled={setupRules.length <= 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleBack}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSetup}>
                <Check className="h-4 w-4 mr-2" />
                Salvar Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Period Selection */}
      {currentStep === "period" && selectedSetup && (
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Periodo</CardTitle>
            <CardDescription>
              Setup: <span className="font-medium">{selectedSetup.name}</span>
              <span className="mx-2">|</span>
              Regras:{" "}
              {selectedSetup.rules.map((r, i) => (
                <Badge key={i} variant="outline" className="mx-1">
                  {getRuleLabel(r)}: {r.profit_percentage}%
                </Badge>
              ))}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { type: "yesterday" as PeriodType, label: "Ontem", icon: Calendar },
                { type: "last-week" as PeriodType, label: "Ultima Semana", icon: Calendar },
                { type: "last-month" as PeriodType, label: "Ultimo Mes", icon: Calendar },
                { type: "last-quarter" as PeriodType, label: "Ultimo Trimestre", icon: Calendar },
                { type: "last-year" as PeriodType, label: "Ultimo Ano", icon: Calendar },
                { type: "custom" as PeriodType, label: "Personalizado", icon: Settings },
              ].map(({ type, label, icon: Icon }) => (
                <Card
                  key={type}
                  className={`cursor-pointer transition-colors ${
                    periodType === type ? "border-primary bg-primary/5" : "hover:border-primary/50"
                  }`}
                  onClick={() => setPeriodType(type)}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${periodType === type ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-medium">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {periodType === "custom" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Inicio</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleGenerateReport}
                disabled={periodType === "custom" && (!customStartDate || !customEndDate)}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Gerar Relatorio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Report Display */}
      {currentStep === "report" && (
        <div className="space-y-6">
          {reportLoading ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Gerando relatorio...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Export Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="outline" onClick={handleExportXLSX}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar XLSX
                </Button>
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>

              {/* Report Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento de Pagamentos</CardTitle>
                  <CardDescription>
                    {reportData.length} pagamento(s) encontrado(s) no periodo selecionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="text-left p-3 font-medium">Cliente</th>
                            <th className="text-left p-3 font-medium">CPF/CNPJ</th>
                            <th className="text-right p-3 font-medium">Valor Pago</th>
                            <th className="text-right p-3 font-medium">Data Pgto</th>
                            <th className="text-right p-3 font-medium">Dias Venc.</th>
                            <th className="text-center p-3 font-medium">Faixa</th>
                            <th className="text-right p-3 font-medium">% AlteaPay</th>
                            <th className="text-right p-3 font-medium">Lucro AlteaPay</th>
                            <th className="text-right p-3 font-medium">Repasse</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-3 font-medium truncate max-w-[150px]">{row.clientName}</td>
                              <td className="p-3 text-muted-foreground">{row.cpfCnpj}</td>
                              <td className="p-3 text-right">{formatBRL(row.paidAmount)}</td>
                              <td className="p-3 text-right">{row.paymentDate}</td>
                              <td className="p-3 text-right">{row.daysExpired}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline">{row.ruleLabel}</Badge>
                              </td>
                              <td className="p-3 text-right">{row.profitPercentage}%</td>
                              <td className="p-3 text-right text-green-600 dark:text-green-400">
                                {formatBRL(row.alteapayProfit)}
                              </td>
                              <td className="p-3 text-right text-blue-600 dark:text-blue-400">
                                {formatBRL(row.clientTransfer)}
                              </td>
                            </tr>
                          ))}
                          {reportData.length === 0 && (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-muted-foreground">
                                Nenhum pagamento encontrado no periodo selecionado
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Summary */}
              {reportData.length > 0 && (
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      Resumo do Periodo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-background rounded-lg">
                        <p className="text-sm text-muted-foreground">Total de Pagamentos</p>
                        <p className="text-2xl font-bold">{reportSummary.totalPayments}</p>
                      </div>
                      <div className="p-4 bg-background rounded-lg">
                        <p className="text-sm text-muted-foreground">Valor Total Recebido</p>
                        <p className="text-2xl font-bold">{formatBRL(reportSummary.totalReceived)}</p>
                      </div>
                      <div className="p-4 bg-background rounded-lg border-2 border-green-500/50">
                        <p className="text-sm text-muted-foreground">Lucro AlteaPay Total</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatBRL(reportSummary.totalAlteapay)}
                        </p>
                      </div>
                      <div className="p-4 bg-background rounded-lg border-2 border-blue-500/50">
                        <p className="text-sm text-muted-foreground">Repasse para {selectedCompany?.name}</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatBRL(reportSummary.totalTransfer)}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-3">Breakdown por Faixa:</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {Object.entries(reportSummary.byRule).map(([label, data]) => (
                          <div key={label} className="p-3 bg-background rounded-lg">
                            <Badge variant="secondary" className="mb-2">{label}</Badge>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-muted-foreground">Pagamentos:</span> {data.count}</p>
                              <p><span className="text-muted-foreground">Recebido:</span> {formatBRL(data.received)}</p>
                              <p className="text-green-600 dark:text-green-400">
                                <span className="text-muted-foreground">AlteaPay:</span> {formatBRL(data.alteapay)}
                              </p>
                              <p className="text-blue-600 dark:text-blue-400">
                                <span className="text-muted-foreground">Repasse:</span> {formatBRL(data.transfer)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o setup "{setupToDelete?.name}"? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteSetup}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
