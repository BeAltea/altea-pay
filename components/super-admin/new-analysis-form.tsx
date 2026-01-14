"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { runAsyncAssertivaAnalysis } from "@/app/actions/run-async-assertiva-analysis"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"

export default function NewAnalysisForm() {
  const [documento, setDocumento] = useState("")
  const [tipo, setTipo] = useState<"pf" | "pj">("pf")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!documento) {
      toast({
        title: "Erro",
        description: "Informe o CPF ou CNPJ",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await runAsyncAssertivaAnalysis({
        documento,
        tipo,
      })

      if (response.success) {
        setResult(response)
        toast({
          title: "Análise Enviada",
          description: "A análise foi enviada para processamento. Aguarde 2-5 minutos.",
        })
      } else {
        toast({
          title: "Erro",
          description: response.error || "Erro ao enviar análise",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="tipo">Tipo de Análise</Label>
          <div className="flex gap-4 mt-2">
            <Button
              type="button"
              variant={tipo === "pf" ? "default" : "outline"}
              onClick={() => setTipo("pf")}
              className="flex-1"
            >
              Pessoa Física (CPF)
            </Button>
            <Button
              type="button"
              variant={tipo === "pj" ? "default" : "outline"}
              onClick={() => setTipo("pj")}
              className="flex-1"
            >
              Pessoa Jurídica (CNPJ)
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="documento">{tipo === "pf" ? "CPF" : "CNPJ"}</Label>
          <Input
            id="documento"
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            placeholder={tipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
            maxLength={tipo === "pf" ? 14 : 18}
          />
          <p className="text-sm text-muted-foreground mt-1">Digite apenas os números ou com formatação</p>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar Análise Assíncrona
        </Button>

        {result && result.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-800 font-semibold">
              <CheckCircle className="h-5 w-5" />
              Análise Enviada com Sucesso
            </div>
            <div className="text-sm text-green-700 space-y-1">
              <p>
                <strong>UUID:</strong> {result.uuid}
              </p>
              <p>
                <strong>Identificador:</strong> {result.identificador}
              </p>
              <p>
                <strong>Tempo estimado:</strong> {result.estimatedTime}
              </p>
              <p className="mt-2 text-xs">
                O resultado será processado automaticamente e salvo no banco de dados. Você pode visualizar em
                "Análises" quando concluído.
              </p>
            </div>
          </div>
        )}

        {result && !result.success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 font-semibold">
              <AlertCircle className="h-5 w-5" />
              Erro ao Enviar Análise
            </div>
            <p className="text-sm text-red-700 mt-2">{result.error}</p>
          </div>
        )}
      </form>
    </Card>
  )
}
