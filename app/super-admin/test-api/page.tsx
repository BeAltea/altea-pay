"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

export default function TestAPIPage() {
  const [cpf, setCpf] = useState("01820462498")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testAPI = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    console.log("[v0] Testing Portal da Transparência API...")
    console.log("[v0] CPF:", cpf)

    try {
      const apiKey = process.env.NEXT_PUBLIC_PORTAL_TRANSPARENCIA_API_KEY || process.env.PORTAL_TRANSPARENCIA_API_KEY

      if (!apiKey) {
        throw new Error("API key não configurada. Configure PORTAL_TRANSPARENCIA_API_KEY nas variáveis de ambiente.")
      }

      console.log("[v0] API Key configured:", apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4))

      const url = `https://api.portaldatransparencia.gov.br/api-de-dados/servidores/por-cpf?cpf=${cpf.replace(/\D/g, "")}`
      console.log("[v0] Request URL:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "chave-api-dados": apiKey,
          Accept: "application/json",
        },
      })

      console.log("[v0] Response status:", response.status)
      console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

      const text = await response.text()
      console.log("[v0] Response body:", text)

      if (!response.ok) {
        throw new Error(`API retornou status ${response.status}: ${text}`)
      }

      const data = JSON.parse(text)
      setResult(data)
      console.log("[v0] API test successful!")
    } catch (err: any) {
      console.error("[v0] API test failed:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Testar API Portal da Transparência</CardTitle>
          <CardDescription>
            Teste a API do Portal da Transparência para verificar se a API key está funcionando corretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF para Teste</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="Digite um CPF"
              maxLength={14}
            />
          </div>

          <Button onClick={testAPI} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Testar API
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Erro:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="space-y-2">
              <Label>Resposta da API (Sucesso!)</Label>
              <Textarea value={JSON.stringify(result, null, 2)} readOnly className="font-mono text-sm h-96" />
            </div>
          )}

          <Alert>
            <AlertDescription className="text-sm space-y-2">
              <p>
                <strong>O que esperar:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>Status 200:</strong> API key válida e funcionando
                </li>
                <li>
                  <strong>Status 403:</strong> API key inválida ou expirada
                </li>
                <li>
                  <strong>Status 404:</strong> CPF não encontrado (mas API funcionando)
                </li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
