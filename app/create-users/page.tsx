"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export const dynamic = "force-dynamic"

export default function CreateUsersPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const createDefaultUsers = async () => {
    setLoading(true)
    setMessage("")

    try {
      // Call the API endpoint to create users
      const response = await fetch("/api/create-default-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create users")
      }

      setMessage("Usuários criados com sucesso!")
    } catch (error: any) {
      console.error("Erro:", error)
      setMessage(error.message || "Erro ao criar usuários. Verifique o console.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Criar Usuários Padrão</CardTitle>
          <CardDescription>Cria usuários de teste para o sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Admin:</strong> admin@admin.com / admin123
            </p>
            <p>
              <strong>Cliente:</strong> cliente@cliente.com / cliente123
            </p>
          </div>

          <Button onClick={createDefaultUsers} disabled={loading} className="w-full">
            {loading ? "Criando..." : "Criar Usuários"}
          </Button>

          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
