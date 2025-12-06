"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { getCompanyTableColumns, createCompanyClient } from "@/app/actions/multi-tenant-actions"
import { toast } from "sonner"

interface DynamicCustomerFormProps {
  companyId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function DynamicCustomerForm({ companyId, onSuccess, onCancel }: DynamicCustomerFormProps) {
  const [columns, setColumns] = useState<string[]>([])
  const [tableName, setTableName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<Record<string, string>>({})

  useEffect(() => {
    async function loadColumns() {
      const result = await getCompanyTableColumns(companyId)
      if (result.success) {
        setColumns(result.columns)
        setTableName(result.tableName)
      } else {
        toast.error("Erro ao carregar campos do formulário")
      }
      setLoading(false)
    }
    loadColumns()
  }, [companyId])

  const handleChange = (column: string, value: string) => {
    setFormData((prev) => ({ ...prev, [column]: value }))
  }

  const getFieldType = (columnName: string): string => {
    const lowerCol = columnName.toLowerCase()
    if (lowerCol.includes("email")) return "email"
    if (lowerCol.includes("telefone") || lowerCol.includes("phone") || lowerCol.includes("celular")) return "tel"
    if (lowerCol.includes("valor") || lowerCol.includes("vencido") || lowerCol.includes("divida")) return "number"
    if (lowerCol.includes("dias") || lowerCol.includes("inad")) return "number"
    if (lowerCol.includes("data") || lowerCol.includes("date")) return "date"
    return "text"
  }

  const getFieldLabel = (columnName: string): string => {
    // Converte nomes de colunas em labels legíveis
    return columnName
      .replace(/_/g, " ")
      .replace(/\./g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  const isRequiredField = (columnName: string): boolean => {
    // Define campos obrigatórios
    const lowerCol = columnName.toLowerCase()
    return (
      lowerCol.includes("cliente") ||
      lowerCol.includes("nome") ||
      lowerCol.includes("cpf") ||
      lowerCol.includes("cnpj") ||
      lowerCol.includes("document")
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const result = await createCompanyClient(companyId, formData)

      if (result.success) {
        toast.success(result.message)
        setFormData({})
        onSuccess?.()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("Erro ao cadastrar cliente")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Tabela: <span className="font-mono font-semibold">{tableName}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
        {columns.map((column) => (
          <div key={column} className="space-y-2">
            <Label htmlFor={column}>
              {getFieldLabel(column)}
              {isRequiredField(column) && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={column}
              type={getFieldType(column)}
              value={formData[column] || ""}
              onChange={(e) => handleChange(column, e.target.value)}
              required={isRequiredField(column)}
              placeholder={`Digite ${getFieldLabel(column).toLowerCase()}`}
              step={getFieldType(column) === "number" ? "0.01" : undefined}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cadastrando...
            </>
          ) : (
            "Cadastrar Cliente"
          )}
        </Button>
      </div>
    </form>
  )
}
