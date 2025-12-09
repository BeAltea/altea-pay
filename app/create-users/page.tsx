"use client"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export const dynamic = "force-dynamic"

export default function CreateUsersPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const supabase = createBrowserClient()

  const createDefaultUsers = async () => {
    setLoading(true)
    setMessage("")

    try {
      // Criar usuário admin
      const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
        email: "admin@admin.com",
        password: "admin123",
        email_confirm: true,
        user_metadata: {
          full_name: "Administrador",
        },
      })

      if (adminError) {
        console.error("Erro ao criar admin:", adminError)
      } else {
        // Atualizar perfil do admin
        await supabase.from("profiles").upsert({
          id: adminData.user.id,
          email: "admin@admin.com",
          full_name: "Administrador",
          role: "admin",
        })
      }

      // Criar usuário cliente
      const { data: clientData, error: clientError } = await supabase.auth.admin.createUser({
        email: "cliente@cliente.com",
        password: "cliente123",
        email_confirm: true,
        user_metadata: {
          full_name: "Cliente Teste",
        },
      })

      if (clientError) {
        console.error("Erro ao criar cliente:", clientError)
      } else {
        // Atualizar perfil do cliente
        await supabase.from("profiles").upsert({
          id: clientData.user.id,
          email: "cliente@cliente.com",
          full_name: "Cliente Teste",
          role: "user",
        })
      }

      setMessage("Usuários criados com sucesso!")
    } catch (error) {
      console.error("Erro:", error)
      setMessage("Erro ao criar usuários. Verifique o console.")
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
