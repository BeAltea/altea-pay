"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Users,
  FileText,
  Trash2,
  RefreshCw,
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface Company {
  id: string
  name: string
}

interface ImportarDadosClientProps {
  companies: Company[]
}

type Step = "upload" | "mapping" | "preview" | "importing"

interface ParsedData {
  headers: string[]
  rows: string[][]
  totalRows: number
}

interface ColumnMapping {
  [key: string]: string
}

interface SanitizedRecord {
  document: string
  documentFormatted: string
  documentType: "CPF" | "CNPJ"
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipcode: string
  debtAmount: number
  dueDate: string
  contractNumber: string
  daysOverdue: number
  notes: string
  isDuplicate: boolean
  duplicateCount: number
  originalRows: number[]
  validationErrors: string[]
  isValid: boolean
}

const DB_FIELDS = [
  { value: "name", label: "Nome do Cliente", required: true, group: "required" },
  { value: "document", label: "CPF/CNPJ", required: true, group: "required" },
  { value: "email", label: "Email", required: false, group: "contact" },
  { value: "phone", label: "Telefone", required: false, group: "contact" },
  { value: "address", label: "Endereço", required: false, group: "address" },
  { value: "city", label: "Cidade", required: false, group: "address" },
  { value: "state", label: "Estado/UF", required: false, group: "address" },
  { value: "zipcode", label: "CEP", required: false, group: "address" },
  { value: "debt_amount", label: "Valor da Dívida", required: false, group: "debt" },
  { value: "due_date", label: "Data de Vencimento", required: false, group: "debt" },
  { value: "days_overdue", label: "Dias em Atraso", required: false, group: "debt" },
  { value: "contract_number", label: "Número do Contrato", required: false, group: "debt" },
  { value: "notes", label: "Observações", required: false, group: "other" },
  { value: "ignore", label: "Ignorar esta coluna", required: false, group: "ignore" },
]

function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]/g, "")
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i)
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(9))) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i)
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  return digit === parseInt(cpf.charAt(10))
}

function validateCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]/g, "")
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false

  let length = cnpj.length - 2
  let numbers = cnpj.substring(0, length)
  const digits = cnpj.substring(length)
  let sum = 0
  let pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  length = length + 1
  numbers = cnpj.substring(0, length)
  sum = 0
  pos = length - 7

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  return result === parseInt(digits.charAt(1))
}

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/[^\d]/g, "")
  if (digits.length !== 11) return cpf
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/[^\d]/g, "")
  if (digits.length !== 14) return cnpj
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function parseMonetaryValue(value: string | number): number {
  if (typeof value === "number") return value
  if (!value) return 0

  // Handle Brazilian format: 1.234,56 or 1234,56
  const cleaned = String(value)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")

  return parseFloat(cleaned) || 0
}

function parseBrazilianDate(value: string): string {
  if (!value) return ""

  // Try DD/MM/YYYY format
  const brMatch = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (brMatch) {
    const [, day, month, year] = brMatch
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  // Try YYYY-MM-DD format (already ISO)
  const isoMatch = String(value).match(/^\d{4}-\d{2}-\d{2}/)
  if (isoMatch) {
    return isoMatch[0]
  }

  return value
}

export function ImportarDadosClient({ companies }: ImportarDadosClientProps) {
  const [step, setStep] = useState<Step>("upload")
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [headerRow, setHeaderRow] = useState(0)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [sanitizedRecords, setSanitizedRecords] = useState<SanitizedRecord[]>([])
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{
    success: number
    failed: number
    duplicatesRemoved: number
  } | null>(null)
  const [previewTab, setPreviewTab] = useState<"valid" | "duplicates" | "invalid">("valid")

  const detectDelimiter = (text: string): string => {
    const firstLine = text.split("\n")[0]
    const delimiters = [";", ",", "\t", "|"]
    let maxCount = 0
    let bestDelimiter = ","

    for (const delimiter of delimiters) {
      const count = (firstLine.match(new RegExp(`\\${delimiter}`, "g")) || []).length
      if (count > maxCount) {
        maxCount = count
        bestDelimiter = delimiter
      }
    }

    return bestDelimiter
  }

  const parseCSV = (text: string, delimiter: string): string[][] => {
    const lines = text.split("\n").filter((line) => line.trim())
    const result: string[][] = []

    for (const line of lines) {
      const row: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === delimiter && !inQuotes) {
          row.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      row.push(current.trim())
      result.push(row)
    }

    return result
  }

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    const fileName = selectedFile.name.toLowerCase()

    try {
      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const arrayBuffer = await selectedFile.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: "array" })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as string[][]

        setParsedData({
          headers: jsonData[0]?.map(h => String(h)) || [],
          rows: jsonData.map(row => row.map(cell => String(cell))),
          totalRows: jsonData.length,
        })
      } else if (fileName.endsWith(".csv")) {
        const text = await selectedFile.text()
        const delimiter = detectDelimiter(text)
        const rows = parseCSV(text, delimiter)

        setParsedData({
          headers: rows[0] || [],
          rows: rows,
          totalRows: rows.length,
        })
      } else {
        toast.error("Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)")
        return
      }
    } catch (error) {
      console.error("[Importar Dados] Erro ao processar arquivo:", error)
      toast.error("Erro ao processar arquivo. Verifique o formato e tente novamente.")
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const input = document.getElementById("file-upload") as HTMLInputElement
      const dt = new DataTransfer()
      dt.items.add(droppedFile)
      input.files = dt.files
      input.dispatchEvent(new Event("change", { bubbles: true }))
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleHeaderRowChange = (row: number) => {
    if (!parsedData) return
    setHeaderRow(row)
    setParsedData({
      ...parsedData,
      headers: parsedData.rows[row]?.map(h => String(h)) || [],
    })
  }

  const autoMapColumns = () => {
    if (!parsedData) return

    const mapping: ColumnMapping = {}
    const headers = parsedData.headers.map((h) =>
      h
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    )

    headers.forEach((header, index) => {
      const originalHeader = parsedData.headers[index]

      if (header.includes("nome") || header.includes("cliente") || header.includes("titular") || header.includes("razao")) {
        mapping[originalHeader] = "name"
      } else if (header.includes("email") || header.includes("e-mail")) {
        mapping[originalHeader] = "email"
      } else if (header.includes("telefone") || header.includes("celular") || header.includes("fone") || header.includes("tel")) {
        mapping[originalHeader] = "phone"
      } else if (header.includes("cpf") || header.includes("cnpj") || header.includes("documento") || header.includes("doc")) {
        mapping[originalHeader] = "document"
      } else if (header.includes("endereco") || header.includes("rua") || header.includes("logradouro")) {
        mapping[originalHeader] = "address"
      } else if (header.includes("cidade") || header.includes("municipio")) {
        mapping[originalHeader] = "city"
      } else if (header.includes("estado") || header.includes("uf")) {
        mapping[originalHeader] = "state"
      } else if (header.includes("cep")) {
        mapping[originalHeader] = "zipcode"
      } else if (header.includes("valor") || header.includes("divida") || header.includes("debito") || header.includes("saldo")) {
        mapping[originalHeader] = "debt_amount"
      } else if (header.includes("vencimento") || header.includes("venc")) {
        mapping[originalHeader] = "due_date"
      } else if (header.includes("dias") && (header.includes("atraso") || header.includes("inad"))) {
        mapping[originalHeader] = "days_overdue"
      } else if (header.includes("contrato") || header.includes("numero")) {
        mapping[originalHeader] = "contract_number"
      } else if (header.includes("obs") || header.includes("nota")) {
        mapping[originalHeader] = "notes"
      } else {
        mapping[originalHeader] = "ignore"
      }
    })

    setColumnMapping(mapping)
  }

  const sanitizeAndDeduplicate = () => {
    if (!parsedData) return

    const dataRows = parsedData.rows.slice(headerRow + 1)
    const recordsByDocument = new Map<string, SanitizedRecord>()

    dataRows.forEach((row, rowIndex) => {
      const rowData: Record<string, string> = {}

      parsedData.headers.forEach((header, colIndex) => {
        const dbField = columnMapping[header]
        if (dbField && dbField !== "ignore") {
          rowData[dbField] = String(row[colIndex] || "").trim()
        }
      })

      // Extract and clean document
      const rawDocument = rowData.document || ""
      const cleanDocument = rawDocument.replace(/[^\d]/g, "")

      if (!cleanDocument) return

      const documentType: "CPF" | "CNPJ" = cleanDocument.length === 11 ? "CPF" : "CNPJ"
      const documentFormatted = documentType === "CPF" ? formatCPF(cleanDocument) : formatCNPJ(cleanDocument)

      // Validate document
      const validationErrors: string[] = []
      let isValidDocument = true

      if (documentType === "CPF") {
        isValidDocument = validateCPF(cleanDocument)
        if (!isValidDocument) {
          validationErrors.push("CPF inválido")
        }
      } else if (documentType === "CNPJ") {
        isValidDocument = validateCNPJ(cleanDocument)
        if (!isValidDocument) {
          validationErrors.push("CNPJ inválido")
        }
      } else {
        validationErrors.push("Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos")
        isValidDocument = false
      }

      // Validate name
      const name = rowData.name || ""
      if (!name) {
        validationErrors.push("Nome é obrigatório")
      }

      const debtAmount = parseMonetaryValue(rowData.debt_amount || "0")
      const dueDate = parseBrazilianDate(rowData.due_date || "")
      const daysOverdue = parseInt(String(rowData.days_overdue || "0").replace(/\D/g, "")) || 0

      const newRecord: SanitizedRecord = {
        document: cleanDocument,
        documentFormatted,
        documentType,
        name,
        email: rowData.email || "",
        phone: rowData.phone || "",
        address: rowData.address || "",
        city: rowData.city || "",
        state: rowData.state || "",
        zipcode: rowData.zipcode || "",
        debtAmount,
        dueDate,
        contractNumber: rowData.contract_number || "",
        daysOverdue,
        notes: rowData.notes || "",
        isDuplicate: false,
        duplicateCount: 1,
        originalRows: [rowIndex + headerRow + 2], // 1-indexed for user display
        validationErrors,
        isValid: validationErrors.length === 0,
      }

      // Check for duplicate by document
      const existingRecord = recordsByDocument.get(cleanDocument)
      if (existingRecord) {
        // Merge: keep the most complete data, accumulate debt
        existingRecord.isDuplicate = true
        existingRecord.duplicateCount++
        existingRecord.originalRows.push(rowIndex + headerRow + 2)

        // Accumulate debt amount
        existingRecord.debtAmount += newRecord.debtAmount

        // Keep most recent due date or higher days overdue
        if (newRecord.daysOverdue > existingRecord.daysOverdue) {
          existingRecord.daysOverdue = newRecord.daysOverdue
          existingRecord.dueDate = newRecord.dueDate
        }

        // Fill in missing data from new record
        if (!existingRecord.email && newRecord.email) existingRecord.email = newRecord.email
        if (!existingRecord.phone && newRecord.phone) existingRecord.phone = newRecord.phone
        if (!existingRecord.address && newRecord.address) existingRecord.address = newRecord.address
        if (!existingRecord.city && newRecord.city) existingRecord.city = newRecord.city
        if (!existingRecord.state && newRecord.state) existingRecord.state = newRecord.state
        if (!existingRecord.zipcode && newRecord.zipcode) existingRecord.zipcode = newRecord.zipcode

        // Append notes
        if (newRecord.notes && !existingRecord.notes.includes(newRecord.notes)) {
          existingRecord.notes = existingRecord.notes
            ? `${existingRecord.notes}; ${newRecord.notes}`
            : newRecord.notes
        }
      } else {
        recordsByDocument.set(cleanDocument, newRecord)
      }
    })

    const records = Array.from(recordsByDocument.values())
    setSanitizedRecords(records)
    setStep("preview")
  }

  const handleImport = async () => {
    if (!selectedCompanyId) {
      toast.error("Selecione uma empresa")
      return
    }

    const validRecords = sanitizedRecords.filter(r => r.isValid)
    if (validRecords.length === 0) {
      toast.error("Nenhum registro válido para importar")
      return
    }

    setImporting(true)
    setStep("importing")
    setImportProgress(0)

    try {
      const response = await fetch("/api/super-admin/importar-dados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          records: validRecords,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Erro ao importar dados")
      }

      setImportProgress(100)
      setImportResult({
        success: result.imported,
        failed: result.failed,
        duplicatesRemoved: sanitizedRecords.filter(r => r.isDuplicate).length,
      })

      toast.success(`${result.imported} clientes importados com sucesso!`)
    } catch (error: any) {
      console.error("[Importar Dados] Erro:", error)
      toast.error(error.message || "Erro ao importar dados")
      setStep("preview")
    } finally {
      setImporting(false)
    }
  }

  const resetWizard = () => {
    setStep("upload")
    setFile(null)
    setParsedData(null)
    setHeaderRow(0)
    setColumnMapping({})
    setSanitizedRecords([])
    setImportProgress(0)
    setImportResult(null)
  }

  const validRecords = sanitizedRecords.filter(r => r.isValid && !r.isDuplicate)
  const duplicateRecords = sanitizedRecords.filter(r => r.isDuplicate)
  const invalidRecords = sanitizedRecords.filter(r => !r.isValid)

  const canProceedToMapping = !!file && !!parsedData && !!selectedCompanyId
  const canProceedToPreview =
    Object.values(columnMapping).includes("name") &&
    Object.values(columnMapping).includes("document")

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Assistente de Importação</CardTitle>
            <CardDescription>
              Importe clientes com sanitização automática e deduplicação por CPF/CNPJ
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={step === "upload" ? "default" : "secondary"}>1. Upload</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={step === "mapping" ? "default" : "secondary"}>2. Mapeamento</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={step === "preview" ? "default" : "secondary"}>3. Revisão</Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant={step === "importing" ? "default" : "secondary"}>4. Importar</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            {/* Company Selection */}
            <div className="space-y-2">
              <Label htmlFor="company">Empresa de Destino *</Label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger id="company">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* File Upload */}
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center transition-colors hover:border-primary/50"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <div className="space-y-2">
                <Label className="cursor-pointer">
                  <div className="text-lg font-medium mb-2">
                    {file ? file.name : "Arraste um arquivo ou clique para selecionar"}
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Formatos aceitos: CSV, XLSX, XLS (máx. 10MB)
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button type="button" onClick={() => document.getElementById("file-upload")?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Escolher Arquivo
                  </Button>
                </Label>
              </div>
            </div>

            {file && parsedData && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{file.name}</strong>
                      <span className="text-muted-foreground ml-2">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB) - {parsedData.totalRows} linhas
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFile(null)
                        setParsedData(null)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Preview first rows */}
            {parsedData && parsedData.rows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Preview das primeiras linhas</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Linha de cabeçalho:</Label>
                    <Select value={headerRow.toString()} onValueChange={(v) => handleHeaderRowChange(parseInt(v))}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {parsedData.rows.slice(0, 5).map((_, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            Linha {index + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <ScrollArea className="h-48 border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {parsedData.headers.map((header, index) => (
                          <TableHead key={index} className="font-bold bg-muted whitespace-nowrap">
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.rows.slice(headerRow + 1, headerRow + 6).map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <TableCell key={cellIndex} className="max-w-xs truncate">
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => {
                  autoMapColumns()
                  setStep("mapping")
                }}
                disabled={!canProceedToMapping}
              >
                Próximo: Mapear Colunas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && parsedData && (
          <div className="space-y-6">
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <strong>Campos obrigatórios:</strong> Nome e Documento (CPF/CNPJ)
                </div>
                <div className="flex gap-2">
                  <Badge variant={Object.values(columnMapping).includes("name") ? "default" : "destructive"}>
                    Nome: {Object.values(columnMapping).includes("name") ? "✓" : "✗"}
                  </Badge>
                  <Badge variant={Object.values(columnMapping).includes("document") ? "default" : "destructive"}>
                    Documento: {Object.values(columnMapping).includes("document") ? "✓" : "✗"}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {parsedData.headers.map((header, index) => {
                  const mappedField = columnMapping[header] || "ignore"
                  const fieldInfo = DB_FIELDS.find((f) => f.value === mappedField)
                  const isRequired = fieldInfo?.required || false
                  const sampleValue = parsedData.rows[headerRow + 1]?.[index] || "N/A"

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                        isRequired && mappedField !== "ignore" ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="font-medium">{header}</Label>
                          {isRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          Exemplo: {sampleValue}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <Select
                        value={columnMapping[header] || "ignore"}
                        onValueChange={(value) => setColumnMapping({ ...columnMapping, [header]: value })}
                      >
                        <SelectTrigger className="w-56 flex-shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            Campos Obrigatórios
                          </div>
                          {DB_FIELDS.filter((f) => f.group === "required").map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                            Contato
                          </div>
                          {DB_FIELDS.filter((f) => f.group === "contact").map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                            Endereço
                          </div>
                          {DB_FIELDS.filter((f) => f.group === "address").map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                            Dívida
                          </div>
                          {DB_FIELDS.filter((f) => f.group === "debt").map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                            Outros
                          </div>
                          {DB_FIELDS.filter((f) => f.group === "other").map((field) => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                          <div className="border-t mt-2" />
                          <SelectItem value="ignore" className="text-muted-foreground">
                            Ignorar esta coluna
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="text-sm grid grid-cols-2 gap-2">
                  <div>Total de colunas: <strong>{parsedData.headers.length}</strong></div>
                  <div>Mapeadas: <strong>{Object.values(columnMapping).filter((v) => v !== "ignore").length}</strong></div>
                  <div>Ignoradas: <strong>{Object.values(columnMapping).filter((v) => v === "ignore").length}</strong></div>
                  <div>Registros: <strong>{parsedData.totalRows - headerRow - 1}</strong></div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={sanitizeAndDeduplicate} disabled={!canProceedToPreview}>
                Próximo: Revisar Dados
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview Sanitized Data */}
        {step === "preview" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{validRecords.length}</div>
                      <div className="text-sm text-muted-foreground">Prontos para importar</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-amber-500" />
                    <div>
                      <div className="text-2xl font-bold">{duplicateRecords.length}</div>
                      <div className="text-sm text-muted-foreground">Duplicados (consolidados)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div>
                      <div className="text-2xl font-bold">{invalidRecords.length}</div>
                      <div className="text-sm text-muted-foreground">Inválidos (ignorados)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Preview Tabs */}
            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as typeof previewTab)}>
              <TabsList>
                <TabsTrigger value="valid">
                  Válidos ({validRecords.length})
                </TabsTrigger>
                <TabsTrigger value="duplicates">
                  Duplicados ({duplicateRecords.length})
                </TabsTrigger>
                <TabsTrigger value="invalid">
                  Inválidos ({invalidRecords.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="valid" className="mt-4">
                <ScrollArea className="h-[300px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="text-right">Valor Dívida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRecords.slice(0, 50).map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">{record.documentType}</Badge>
                            <span className="ml-2 font-mono text-sm">{record.documentFormatted}</span>
                          </TableCell>
                          <TableCell>{record.name}</TableCell>
                          <TableCell>{record.email || "-"}</TableCell>
                          <TableCell>{record.phone || "-"}</TableCell>
                          <TableCell className="text-right">
                            {record.debtAmount > 0
                              ? `R$ ${record.debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "-"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validRecords.length > 50 && (
                    <div className="p-4 text-center text-muted-foreground">
                      Mostrando 50 de {validRecords.length} registros
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="duplicates" className="mt-4">
                {duplicateRecords.length === 0 ? (
                  <Alert>
                    <AlertDescription>Nenhum registro duplicado encontrado.</AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Documento</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Ocorrências</TableHead>
                          <TableHead>Linhas Originais</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {duplicateRecords.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant="outline">{record.documentType}</Badge>
                              <span className="ml-2 font-mono text-sm">{record.documentFormatted}</span>
                            </TableCell>
                            <TableCell>{record.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{record.duplicateCount}x</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {record.originalRows.join(", ")}
                            </TableCell>
                            <TableCell className="text-right">
                              R$ {record.debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="invalid" className="mt-4">
                {invalidRecords.length === 0 ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>Todos os registros são válidos!</AlertDescription>
                  </Alert>
                ) : (
                  <ScrollArea className="h-[300px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Documento</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Erros</TableHead>
                          <TableHead>Linha</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invalidRecords.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">
                              {record.document || "(vazio)"}
                            </TableCell>
                            <TableCell>{record.name || "(vazio)"}</TableCell>
                            <TableCell>
                              {record.validationErrors.map((error, i) => (
                                <Badge key={i} variant="destructive" className="mr-1 mb-1">
                                  {error}
                                </Badge>
                              ))}
                            </TableCell>
                            <TableCell>{record.originalRows[0]}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>

            {duplicateRecords.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{duplicateRecords.length} registros duplicados</strong> foram consolidados por CPF/CNPJ.
                  Os valores de dívida foram somados e os dados mais completos foram mantidos.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Mapeamento
              </Button>
              <Button
                onClick={handleImport}
                disabled={validRecords.length === 0}
              >
                Importar {validRecords.length + duplicateRecords.length} Clientes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="space-y-6 text-center py-8">
            {importing ? (
              <>
                <RefreshCw className="h-16 w-16 text-primary mx-auto animate-spin" />
                <div className="text-xl font-bold">Importando dados...</div>
                <Progress value={importProgress} className="w-full max-w-md mx-auto" />
                <p className="text-muted-foreground">Isso pode levar alguns instantes</p>
              </>
            ) : importResult ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <div className="text-xl font-bold">Importação Concluída!</div>
                <div className="space-y-2">
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {importResult.success} clientes importados
                  </Badge>
                  {importResult.duplicatesRemoved > 0 && (
                    <div>
                      <Badge variant="secondary" className="text-lg px-4 py-2">
                        {importResult.duplicatesRemoved} duplicados consolidados
                      </Badge>
                    </div>
                  )}
                  {importResult.failed > 0 && (
                    <div>
                      <Badge variant="destructive" className="text-lg px-4 py-2">
                        {importResult.failed} falharam
                      </Badge>
                    </div>
                  )}
                </div>
                <Button onClick={resetWizard} className="mt-4">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Nova Importação
                </Button>
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
