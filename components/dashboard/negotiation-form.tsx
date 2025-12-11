"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface NegotiationFormProps {
  customerId: string
  companyId: string
  totalDebt: number
  customerName: string
  isSuperAdmin: boolean
}

export function NegotiationForm({ customerId, companyId, totalDebt, customerName }: NegotiationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [discountPercent, setDiscountPercent] = useState("0")
  const [installments, setInstallments] = useState("1")
  const [paymentMethod, setPaymentMethod] = useState("boleto")
  const [terms, setTerms] = useState("")
  const [attendantName, setAttendantName] = useState("")

  const discountAmount = (totalDebt * Number(discountPercent)) / 100
  const finalAmount = totalDebt - discountAmount
  const installmentValue = finalAmount / Number(installments)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.from("agreements").insert({
        customer_id: customerId,
        company_id: companyId,
        original_amount: totalDebt,
        agreed_amount: finalAmount,
        discount_amount: discountAmount,
        installments: Number(installments),
        status: "pending",
        terms: terms || `Acordo em ${installments}x de R$ ${installmentValue.toFixed(2)}`,
        attendant_name: attendantName || null,
      })

      if (error) throw error

      await supabase.from("notifications").insert({
        user_id: customerId,
        company_id: companyId,
        type: "negotiation",
        title: "Nova Proposta de Acordo",
        description: `Proposta de R$ ${finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em ${installments}x`,
      })

      alert("Proposta enviada com sucesso!")
      router.push("/dashboard/agreements")
    } catch (error) {
      console.error("Error:", error)
      alert("Erro ao criar negociação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Proposta de Negociação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Valor Original</Label>
              <Input value={`R$ ${totalDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountPercent">Desconto (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Valor Final</Label>
              <Input
                value={`R$ ${finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                disabled
                className="font-bold text-green-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="installments">Parcelas</Label>
              <Select value={installments} onValueChange={setInstallments}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 9, 12].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x de R$ {(finalAmount / n).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="attendantName">Atendente Responsável</Label>
            <Input
              id="attendantName"
              placeholder="Nome do atendente..."
              value={attendantName}
              onChange={(e) => setAttendantName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Termos do Acordo</Label>
            <Textarea
              id="terms"
              placeholder="Descreva os termos..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Enviando..." : "Enviar Proposta"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
