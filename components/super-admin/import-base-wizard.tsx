"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, ArrowRight, ArrowLeft } from "lucide-react"
import { importCustomersToCompany } from "@/app/actions/company-actions"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"

interface ImportBaseWizardProps {
  companyId: string | null
  onComplete?: (data: any[]) => void
  onSkip?: () => void
}

type Step = "upload" | "preview" | "mapping" | "validation" | "importing"

interface ParsedData {
  headers: string[]
  rows: string[][]
  totalRows: number
}

interface ColumnMapping {
  [key: string]: string // fileColumn -> dbField
}

const DB_FIELDS = [
  { value: "name", label: "Nome do Cliente", required: true },
  { value: "document", label: "CPF/CNPJ", required: true },
  { value: "email", label: "Email", required: false },
  { value: "phone", label: "Telefone", required: false },
  { value: "address", label: "Endereço Completo", required: false },
  { value: "street", label: "Rua/Avenida", required: false },
  { value: "number", label: "Número", required: false },
  { value: "complement", label: "Complemento", required: false },
  { value: "neighborhood", label: "Bairro", required: false },
  { value: "city", label: "Cidade", required: false },
  { value: "state", label: "Estado/UF", required: false },
  { value: "zipcode", label: "CEP", required: false },
  { value: "country", label: "País", required: false },
  { value: "debt_amount", label: "Valor da Dívida/Débito", required: false },
  { value: "original_amount", label: "Valor Original", required: false },
  { value: "interest_amount", label: "Valor de Juros", required: false },
  { value: "fine_amount", label: "Valor de Multa", required: false },
  { value: "due_date", label: "Data de Vencimento", required: false },
  { value: "first_due_date", label: "Primeira Vencida", required: false },
  { value: "payment_date", label: "Data de Pagamento", required: false },
  { value: "contract_number", label: "Número do Contrato", required: false },
  { value: "invoice_number", label: "Número da Fatura", required: false },
  { value: "days_overdue", label: "Dias em Atraso", required: false },
  { value: "status", label: "Status", required: false },
  { value: "notes", label: "Observações/Notas", required: false },
  { value: "birth_date", label: "Data de Nascimento", required: false },
  { value: "company_name", label: "Razão Social", required: false },
  { value: "trade_name", label: "Nome Fantasia", required: false },
  { value: "contact_person", label: "Pessoa de Contato", required: false },
  { value: "secondary_phone", label: "Telefone Secundário", required: false },
  { value: "whatsapp", label: "WhatsApp", required: false },
  { value: "custom_field_1", label: "Campo Customizado 1", required: false },
  { value: "custom_field_2", label: "Campo Customizado 2", required: false },
  { value: "custom_field_3", label: "Campo Customizado 3", required: false },
  { value: "ignore", label: "🚫 Ignorar esta coluna", required: false },
]

export function ImportBaseWizard({ companyId, onComplete, onSkip }: ImportBaseWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [headerRow, setHeaderRow] = useState(0)
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [validationResults, setValidationResults] = useState<{ valid: number; invalid: number; errors: string[] }>({
    valid: 0,
    invalid: 0,
    errors: [],
  })
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)

  const isCreationMode = companyId === null

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          headers: jsonData[0] || [],
          rows: jsonData,
          totalRows: jsonData.length,
        })
      } else if (fileName.endsWith(".csv")) {
        const text = await selectedFile.text()
        const delimiter = detectDelimiter(text)
        console.log("[v0] Delimiter detectado:", delimiter)
        const rows = parseCSV(text, delimiter)

        setParsedData({
          headers: rows[0] || [],
          rows: rows,
          totalRows: rows.length,
        })
      } else {
        alert("Formato de arquivo não suportado. Use CSV ou Excel (.xlsx, .xls)")
        return
      }

      setStep("preview")
    } catch (error) {
      console.error("[v0] Erro ao processar arquivo:", error)
      alert("Erro ao processar arquivo. Verifique o formato e tente novamente.")
    }
  }

  const handleHeaderRowChange = (row: number) => {
    if (!parsedData) return
    setHeaderRow(row)
    setParsedData({
      ...parsedData,
      headers: parsedData.rows[row] || [],
    })
  }

  const autoMapColumns = () => {
    if (!parsedData) return

    const mapping: ColumnMapping = {}
    const headers = parsedData.headers.map((h) =>
      h
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    )

    headers.forEach((header, index) => {
      const originalHeader = parsedData.headers[index]

      if (header.includes("nome") || header.includes("cliente") || header.includes("titular")) {
        mapping[originalHeader] = "name"
      } else if (header.includes("email") || header.includes("e-mail")) {
        mapping[originalHeader] = "email"
      } else if (
        header.includes("telefone") ||
        header.includes("celular") ||
        header.includes("whatsapp") ||
        header.includes("fone")
      ) {
        mapping[originalHeader] = "phone"
      } else if (header.includes("cpf") || header.includes("cnpj") || header.includes("documento")) {
        mapping[originalHeader] = "document"
      } else if (header.includes("endereco") || header.includes("rua") || header.includes("avenida")) {
        mapping[originalHeader] = "address"
      } else if (header.includes("cidade") || header.includes("municipio")) {
        mapping[originalHeader] = "city"
      } else if (header.includes("estado") || header.includes("uf")) {
        mapping[originalHeader] = "state"
      } else if (header.includes("cep")) {
        mapping[originalHeader] = "zipcode"
      } else if (
        header.includes("valor") ||
        header.includes("divida") ||
        header.includes("debito") ||
        header.includes("vencido")
      ) {
        mapping[originalHeader] = "debt_amount"
      } else if (header.includes("vencimento") || header.includes("data")) {
        mapping[originalHeader] = "due_date"
      } else {
        mapping[originalHeader] = "ignore"
      }
    })

    setColumnMapping(mapping)
  }

  const validateData = () => {
    if (!parsedData) return

    let valid = 0
    let invalid = 0
    const errors: string[] = []

    const dataRows = parsedData.rows.slice(headerRow + 1)

    dataRows.forEach((row, index) => {
      const rowData: any = {}

      parsedData.headers.forEach((header, colIndex) => {
        const dbField = columnMapping[header]
        if (dbField && dbField !== "ignore") {
          rowData[dbField] = row[colIndex] || ""
        }
      })

      if (!rowData.name || !rowData.document) {
        invalid++
        errors.push(`Linha ${index + 2}: Nome ou Documento faltando`)
      } else {
        valid++
      }
    })

    setValidationResults({ valid, invalid, errors: errors.slice(0, 10) })
    setStep("validation")
  }

  const handleImport = async () => {
    if (!parsedData) return

    setImporting(true)
    setStep("importing")

    try {
      const dataRows = parsedData.rows.slice(headerRow + 1)
      const customers = dataRows.map((row) => {
        const customer: Record<string, string> = {}

        parsedData.headers.forEach((header, colIndex) => {
          const dbField = columnMapping[header]
          if (dbField && dbField !== "ignore") {
            customer[dbField] = String(row[colIndex] || "")
          }
        })

        return customer
      })

      const plainCustomers = JSON.parse(JSON.stringify(customers))

      console.log("[v0] Processando", plainCustomers.length, "clientes")

      if (isCreationMode && onComplete) {
        console.log("[v0] Modo criação: retornando dados via callback")
        setImportResult({
          success: plainCustomers.length,
          failed: 0,
        })
        setTimeout(() => {
          onComplete(plainCustomers)
        }, 1000)
        return
      }

      if (!isCreationMode && companyId) {
        console.log("[v0] Modo importação: importando para empresa", companyId)
        const result = await importCustomersToCompany(companyId, plainCustomers)

        if (result.success) {
          setImportResult({
            success: result.imported || 0,
            failed: result.failed || 0,
          })
          setTimeout(() => {
            router.refresh()
          }, 2000)
        } else {
          alert(result.error || "Erro ao importar clientes")
          setStep("validation")
        }
      }
    } catch (error) {
      console.error("[v0] Erro ao importar:", error)
      alert("Erro ao importar clientes")
      setStep("validation")
    } finally {
      setImporting(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Assistente de Importação de Clientes</CardTitle>
        <CardDescription>
          {isCreationMode
            ? "Importe clientes durante a criação da empresa"
            : "Importe clientes de arquivos CSV ou Excel com mapeamento visual de colunas"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-12 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-lg font-medium mb-2">Selecione um arquivo</div>
                <div className="text-sm text-muted-foreground mb-4">Arraste e solte ou clique para selecionar</div>
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
            <Alert>
              <AlertDescription>
                Formatos aceitos: CSV, XLSX, XLS. O arquivo deve conter colunas como: nome, email, telefone, documento
                (CPF/CNPJ)
              </AlertDescription>
            </Alert>
            {isCreationMode && onSkip && (
              <div className="flex justify-end">
                <Button variant="outline" onClick={onSkip}>
                  Pular Importação
                </Button>
              </div>
            )}
          </div>
        )}

        {step === "preview" && parsedData && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Preview dos Dados</h3>
                <p className="text-sm text-muted-foreground">{parsedData.totalRows} linhas encontradas</p>
              </div>
              <div className="flex items-center gap-2">
                <Label>Linha de Cabeçalho:</Label>
                <Select value={headerRow.toString()} onValueChange={(v) => handleHeaderRowChange(Number.parseInt(v))}>
                  <SelectTrigger className="w-32">
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

            <div className="border rounded-lg overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    {parsedData.headers.map((header, index) => (
                      <TableHead key={index} className="font-bold bg-muted">
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.rows.slice(headerRow + 1, headerRow + 11).map((row, rowIndex) => (
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
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={() => {
                  autoMapColumns()
                  setStep("mapping")
                }}
              >
                Próximo: Mapear Colunas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "mapping" && parsedData && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Mapeamento de Colunas</h3>
              <p className="text-sm text-muted-foreground">
                Selecione qual campo do banco de dados corresponde a cada coluna do arquivo. Cada empresa pode ter
                colunas diferentes.
              </p>
            </div>

            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <div>
                  <strong>Campos obrigatórios:</strong> Nome e Documento (CPF/CNPJ) são necessários para cada cliente.
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={columnMapping && Object.values(columnMapping).includes("name") ? "default" : "destructive"}
                  >
                    Nome: {Object.values(columnMapping).includes("name") ? "✓" : "✗"}
                  </Badge>
                  <Badge
                    variant={
                      columnMapping && Object.values(columnMapping).includes("document") ? "default" : "destructive"
                    }
                  >
                    Documento: {Object.values(columnMapping).includes("document") ? "✓" : "✗"}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {parsedData.headers.map((header, index) => {
                const mappedField = columnMapping[header] || "ignore"
                const fieldInfo = DB_FIELDS.find((f) => f.value === mappedField)
                const isRequired = fieldInfo?.required || false

                return (
                  <div
                    key={index}
                    className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                      isRequired && mappedField !== "ignore" ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Label className="font-medium text-base">{header}</Label>
                        {isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        Exemplo: {parsedData.rows[headerRow + 1]?.[index] || "N/A"}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={columnMapping[header] || "ignore"}
                      onValueChange={(value) => setColumnMapping({ ...columnMapping, [header]: value })}
                    >
                      <SelectTrigger className="w-72 flex-shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[400px]">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Campos Obrigatórios
                        </div>
                        {DB_FIELDS.filter((f) => f.required).map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                          Informações de Contato
                        </div>
                        {DB_FIELDS.filter(
                          (f) => !f.required && ["email", "phone", "secondary_phone", "whatsapp"].includes(f.value),
                        ).map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                          Endereço
                        </div>
                        {DB_FIELDS.filter(
                          (f) =>
                            !f.required &&
                            [
                              "address",
                              "street",
                              "number",
                              "complement",
                              "neighborhood",
                              "city",
                              "state",
                              "zipcode",
                              "country",
                            ].includes(f.value),
                        ).map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                          Valores e Datas
                        </div>
                        {DB_FIELDS.filter(
                          (f) =>
                            !f.required &&
                            [
                              "debt_amount",
                              "original_amount",
                              "interest_amount",
                              "fine_amount",
                              "due_date",
                              "first_due_date",
                              "payment_date",
                              "days_overdue",
                            ].includes(f.value),
                        ).map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2">
                          Outros Campos
                        </div>
                        {DB_FIELDS.filter(
                          (f) =>
                            !f.required &&
                            ![
                              "email",
                              "phone",
                              "secondary_phone",
                              "whatsapp",
                              "address",
                              "street",
                              "number",
                              "complement",
                              "neighborhood",
                              "city",
                              "state",
                              "zipcode",
                              "country",
                              "debt_amount",
                              "original_amount",
                              "interest_amount",
                              "fine_amount",
                              "due_date",
                              "first_due_date",
                              "payment_date",
                              "days_overdue",
                              "ignore",
                            ].includes(f.value),
                        ).map((field) => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}

                        <div className="border-t mt-2" />
                        <SelectItem value="ignore" className="text-muted-foreground">
                          🚫 Ignorar esta coluna
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="text-sm space-y-1">
                  <div className="font-medium mb-2">Resumo do Mapeamento:</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      Total de colunas: <strong>{parsedData.headers.length}</strong>
                    </div>
                    <div>
                      Colunas mapeadas:{" "}
                      <strong>{Object.values(columnMapping).filter((v) => v !== "ignore").length}</strong>
                    </div>
                    <div>
                      Colunas ignoradas:{" "}
                      <strong>{Object.values(columnMapping).filter((v) => v === "ignore").length}</strong>
                    </div>
                    <div>
                      Registros a importar: <strong>{parsedData.totalRows - headerRow - 1}</strong>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("preview")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={validateData}
                disabled={
                  !Object.values(columnMapping).includes("name") || !Object.values(columnMapping).includes("document")
                }
              >
                Próximo: Validar Dados
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "validation" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Validação dos Dados</h3>
              <p className="text-sm text-muted-foreground">Verifique os resultados da validação antes de importar</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{validationResults.valid}</div>
                      <div className="text-sm text-muted-foreground">Registros Válidos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <div>
                      <div className="text-2xl font-bold">{validationResults.invalid}</div>
                      <div className="text-sm text-muted-foreground">Registros Inválidos</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {validationResults.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium mb-2">Erros encontrados:</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationResults.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  {validationResults.errors.length >= 10 && <p className="text-xs mt-2">... e mais erros</p>}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Mapeamento
              </Button>
              <Button onClick={handleImport} disabled={validationResults.valid === 0}>
                {isCreationMode ? "Continuar com" : "Importar"} {validationResults.valid} Clientes
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 text-center py-8">
            {!importResult ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                <div className="text-lg font-medium">
                  {isCreationMode ? "Processando clientes..." : "Importando clientes..."}
                </div>
                <p className="text-sm text-muted-foreground">Isso pode levar alguns instantes</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                <div className="text-xl font-bold">
                  {isCreationMode ? "Dados Processados!" : "Importação Concluída!"}
                </div>
                <div className="space-y-2">
                  <Badge variant="default" className="text-lg px-4 py-2">
                    {importResult.success} clientes {isCreationMode ? "processados" : "importados"} com sucesso
                  </Badge>
                  {importResult.failed > 0 && (
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      {importResult.failed} falharam
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
