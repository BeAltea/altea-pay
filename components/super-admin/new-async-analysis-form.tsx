"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { runAsyncAssertivaAnalysis } from "@/app/actions/run-async-assertiva-analysis"
import { Loader2, CheckCircle2, Clock } from "lucide-react"

export function NewAsyncAnalysisForm() {
  const [documento, setDocumento] = useState("")
  const [tipo, setTipo] = useState<"pf" | "pj">("pf")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
          description: response.error || "Falha ao enviar análise",
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da Análise</CardTitle>
          <CardDescription>Informe o documento e tipo de pessoa para análise completa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Tipo de Pessoa</Label>
              <RadioGroup value={tipo} onValueChange={(value) => setTipo(value as "pf" | "pj")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pf" id="pf" />
                  <Label htmlFor="pf" className="font-normal cursor-pointer">
                    Pessoa Física (CPF)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pj" id="pj" />
                  <Label htmlFor="pj" className="font-normal cursor-pointer">
                    Pessoa Jurídica (CNPJ)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="documento">{tipo === "pf" ? "CPF" : "CNPJ"}</Label>
              <Input
                id="documento"
                placeholder={tipo === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando Análise...
                </>
              ) : (
                "Solicitar Análise Assíncrona"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && result.success && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              Análise Enviada com Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-700">Tempo Estimado</p>
                <p className="text-sm text-green-600">{result.estimatedTime}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-medium text-green-700">Identificador da Consulta</p>
              <p className="text-sm font-mono bg-white p-2 rounded border border-green-200">{result.identificador}</p>
            </div>

            {result.uuid && (
              <div className="space-y-1">
                <p className="font-medium text-green-700">UUID da Assertiva</p>
                <p className="text-sm font-mono bg-white p-2 rounded border border-green-200">{result.uuid}</p>
              </div>
            )}

            <div className="pt-4 border-t border-green-200">
              <p className="text-sm text-green-600">
                Os resultados serão processados automaticamente e aparecerão na listagem de análises quando concluídos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
