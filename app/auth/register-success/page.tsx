"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle, ArrowLeft } from "lucide-react"

export default function RegisterSuccessPage() {
  return (
    <div className="min-h-screen bg-altea-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-white hover:text-altea-gold transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o site
          </Link>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-altea-gold p-3 rounded-xl">
              <div className="h-8 w-8 bg-altea-navy rounded-sm flex items-center justify-center">
                <span className="text-altea-gold font-bold text-lg">A</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">Altea Pay</h1>
          <p className="text-blue-100 mt-2">Sistema de cobrança inteligente</p>
        </div>

        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="space-y-1 pb-6 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-semibold text-altea-navy">Conta criada com sucesso!</CardTitle>
            <CardDescription>Verifique seu email para confirmar sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Enviamos um email de confirmação para você. Clique no link do email para ativar sua conta e fazer login.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Não recebeu o email? Verifique sua caixa de spam ou:</p>
              <Button variant="outline" className="w-full bg-transparent" onClick={() => window.location.reload()}>
                Reenviar email de confirmação
              </Button>
            </div>
            <div className="pt-4 border-t">
              <Link href="/auth/login">
                <Button className="w-full bg-altea-navy hover:bg-altea-navy/90 text-white">Ir para login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
