"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { importCustomersToCompany } from "@/app/actions/company-actions"
import { useRouter } from "next/navigation"

interface ImportBaseFormProps {
  companyId: string
  companyName: string
}

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0]
  const semicolonCount = (firstLine.match(/;/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const tabCount = (firstLine.match(/\t/g) || []).length

  console.log("[v0] Delimiter detection - Semicolon:", semicolonCount, "Comma:", commaCount, "Tab:", tabCount)

  if (tabCount > 0) return "\t"
  if (semicolonCount > commaCount) return ";"
  return ","
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

async function parseExcelFile(file: File): Promise<string[][]> {
  try {
    // Dynamic import of xlsx library
    const XLSX = await import("xlsx")

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Convert to array of arrays
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    console.log("[v0] Excel parsed successfully:", data.length, "rows")
    return data
  } catch (error) {
    console.error("[v0] Error parsing Excel:", error)
    throw new Error("Erro ao processar arquivo Excel. Verifique se o arquivo está corrompido.")
  }
}

export function ImportBaseForm({ companyId, companyName }: ImportBaseFormProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setResult(null)
    setPreview([])

    try {
      console.log("[v0] Processing file:", selectedFile.name, selectedFile.type)

      let rows: string[][] = []

      if (selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls")) {
        console.log("[v0] Detected Excel file")
        rows = await parseExcelFile(selectedFile)
      } else {
        console.log("[v0] Detected CSV file")
        const text = await selectedFile.text()
        const delimiter = detectDelimiter(text)
        console.log("[v0] Using delimiter:", delimiter === ";" ? "semicolon" : delimiter === "\t" ? "tab" : "comma")

        const lines = text.split("\n").filter((line) => line.trim())
        rows = lines.map((line) => parseCSVLine(line, delimiter))
      }

      // Show first 6 rows (header + 5 data rows)
      setPreview(rows.slice(0, 6))
      console.log("[v0] Preview set with", rows.slice(0, 6).length, "rows")
    } catch (err) {
      console.error("[v0] Error processing file:", err)
      setError(err instanceof Error ? err.message : "Erro ao processar arquivo")
    }
  }

  const handleImport = async () => {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      console.log("[v0] Starting import for company:", companyId)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("companyId", companyId)

      const result = await importCustomersToCompany(formData)

      console.log("[v0] Import result:", result)

      if (result.success) {
        setResult({ success: result.customersImported || 0, failed: result.customersFailed || 0 })
        router.refresh()
      } else {
        setError(result.error || "Erro ao importar base")
      }
    } catch (err) {
      console.error("[v0] Import error:", err)
      setError("Erro ao processar arquivo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Base de Clientes
        </CardTitle>
        <CardDescription>Faça upload de um arquivo CSV ou Excel com os dados dos clientes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload */}
        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-4">{file ? file.name : "Selecione um arquivo CSV ou Excel"}</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
            disabled={loading}
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={loading}>
              <span>Selecionar Arquivo</span>
            </Button>
          </label>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview (primeiras 5 linhas):</p>
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    {preview[0].map((header, i) => (
                      <th key={i} className="px-4 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(1).map((row, i) => (
                    <tr key={i} className="border-t">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Button */}
        {file && !result && (
          <Button onClick={handleImport} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar Base
              </>
            )}
          </Button>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{result.success} clientes importados com sucesso</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">{result.failed} clientes falharam</span>
              </div>
            )}
            <Button
              onClick={() => {
                setFile(null)
                setPreview([])
                setResult(null)
              }}
              variant="outline"
              className="w-full bg-transparent"
            >
              Importar Outro Arquivo
            </Button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 p-4 bg-red-50 rounded-lg">
            <XCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <p className="font-medium">Instruções:</p>
          <p>• Formatos aceitos: CSV, XLSX, XLS</p>
          <p>• Tamanho máximo: 10MB</p>
          <p>• Colunas reconhecidas: Nome, Email, Telefone, CPF/CNPJ, Endereço, Cidade, Estado, CEP</p>
          <p>• O sistema detecta automaticamente as colunas do seu arquivo</p>
        </div>
      </CardContent>
    </Card>
  )
}
