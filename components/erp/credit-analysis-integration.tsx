"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, PlayCircle, CheckCircle, AlertCircle } from "lucide-react"
import { runCreditAnalysis } from "@/app/actions/erp-credit-analysis-actions"
import { useToast } from "@/hooks/use-toast"

interface CreditAnalysisIntegrationProps {
  companyId: string
}

export function CreditAnalysisIntegration({ companyId }: CreditAnalysisIntegrationProps) {
  const [autoAnalysis, setAutoAnalysis] = useState(false)
  const [analysisType, setAnalysisType] = useState<"free" | "assertiva">("free")
  const [isRunning, setIsRunning] = useState(false)
  const { toast } = useToast()

  async function handleRunAnalysis() {
    setIsRunning(true)
    try {
      const result = await runCreditAnalysis(companyId, analysisType)

      if (result.success) {
        toast({
          title: "Análise iniciada",
          description: `Análise restritiva ${analysisType === "free" ? "gratuita" : "completa"} iniciada para todos os clientes.`,
        })
      } else {
        toast({
          title: "Erro ao iniciar análise",
          description: result.error || "Ocorreu um erro ao iniciar a análise restritiva.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao iniciar a análise restritiva.",
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <CardTitle>Análise Restritiva Automática</CardTitle>
        </div>
        <CardDescription>Configure análises restritivas automáticas para clientes importados do ERP</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configurações */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-analysis">Análise Automática</Label>
              <p className="text-sm text-muted-foreground">
                Executar análise restritiva automaticamente ao importar novos clientes
              </p>
            </div>
            <Switch id="auto-analysis" checked={autoAnalysis} onCheckedChange={setAutoAnalysis} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis-type">Tipo de Análise</Label>
            <Select value={analysisType} onValueChange={(value: "free" | "assertiva") => setAnalysisType(value)}>
              <SelectTrigger id="analysis-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">
                  <div className="flex items-center space-x-2">
                    <span>Gratuita</span>
                    <Badge variant="outline" className="text-xs">
                      APIs Públicas
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="assertiva">
                  <div className="flex items-center space-x-2">
                    <span>Completa</span>
                    <Badge variant="outline" className="text-xs">
                      Assertiva
                    </Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {analysisType === "free"
                ? "Usa APIs públicas do governo (Portal da Transparência, Receita Federal)"
                : "Usa API da Assertiva Soluções para análise detalhada"}
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Executar Análise Manual</p>
              <p className="text-xs text-muted-foreground">Analisar todos os clientes sem análise restritiva</p>
            </div>
            <Button onClick={handleRunAnalysis} disabled={isRunning}>
              {isRunning ? (
                <>
                  <PlayCircle className="mr-2 h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Executar Agora
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Informações */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-full">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium">APIs Gratuitas</p>
                <p className="text-xs text-muted-foreground">Sem custo adicional</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Assertiva</p>
                <p className="text-xs text-muted-foreground">Análise detalhada</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-full">
                <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Cache Inteligente</p>
                <p className="text-xs text-muted-foreground">Evita duplicatas</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
