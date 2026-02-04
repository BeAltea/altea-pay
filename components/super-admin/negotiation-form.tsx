"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Percent, Send } from "lucide-react"
import { useRouter } from "next/navigation"

interface NegotiationFormProps {
  customerId: string
  companyId: string
  totalDebt: number
  customerName: string
  isSuperAdmin: boolean
}

export function NegotiationForm({
  customerId,
  companyId,
  totalDebt,
  customerName,
  isSuperAdmin,
}: NegotiationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [proposedAmount, setProposedAmount] = useState(totalDebt.toString())
  const [discountPercent, setDiscountPercent] = useState("0")
  const [installments, setInstallments] = useState("1")
  const [paymentMethod, setPaymentMethod] = useState("boleto")
  const [terms, setTerms] = useState("")
  const [observations, setObservations] = useState("")
  const [attendantName, setAttendantName] = useState("")

  // Calculated values
  const discountAmount = (totalDebt * Number(discountPercent)) / 100
  const finalAmount = totalDebt - discountAmount
  const installmentValue = finalAmount / Number(installments)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // TODO: Replace with server action for creating negotiation agreement
      const agreementData = {
        customer_id: customerId,
        company_id: companyId,
        original_amount: totalDebt,
        agreed_amount: finalAmount,
        discount_amount: discountAmount,
        installments: Number(installments),
        status: "pending",
        terms: terms || `Acordo para ${customerName} - ${installments}x de R$ ${installmentValue.toFixed(2)}`,
        attendant_name: attendantName || null,
      }

      console.log("[v0] NegotiationForm - Mock agreement created:", agreementData)

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      alert("Proposta de negociação enviada com sucesso!")

      if (isSuperAdmin) {
        router.push(`/super-admin/companies/${companyId}`)
      } else {
        router.push(`/dashboard/agreements`)
      }
    } catch (error) {
      console.error("Error creating negotiation:", error)
      alert("Erro ao criar negociação. Tente novamente.")
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
          {/* Calculation Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="totalDebt">Valor Original</Label>
              <Input
                id="totalDebt"
                value={`R$ ${totalDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountPercent">Desconto (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Desconto em R$</Label>
              <Input value={`R$ ${discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} disabled />
            </div>

            <div className="space-y-2">
              <Label>Valor Final</Label>
              <Input
                value={`R$ ${finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                disabled
                className="font-bold text-green-600"
              />
            </div>
          </div>

          {/* Payment Terms */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="installments">Número de Parcelas</Label>
              <Select value={installments} onValueChange={setInstallments}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 9, 12, 18, 24].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor da Parcela</Label>
              <Input value={`R$ ${installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} disabled />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto Bancário</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="bank_transfer">Transferência Bancária</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Attendant Name */}
          <div className="space-y-2">
            <Label htmlFor="attendantName">Atendente Responsável</Label>
            <Input
              id="attendantName"
              placeholder="Nome do atendente que está negociando..."
              value={attendantName}
              onChange={(e) => setAttendantName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Opcional - Nome da pessoa responsável por essa negociação</p>
          </div>

          {/* Terms and Observations */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="terms">Termos do Acordo</Label>
              <Textarea
                id="terms"
                placeholder="Descreva os termos e condições do acordo..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observações Internas</Label>
              <Textarea
                id="observations"
                placeholder="Notas internas (não serão enviadas ao cliente)..."
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Summary */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4">Resumo da Proposta</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-semibold">{customerName}</span>
                </div>
                {attendantName && (
                  <div className="flex justify-between">
                    <span>Atendente:</span>
                    <span className="font-semibold">{attendantName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Valor Original:</span>
                  <span>R$ {totalDebt.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Desconto:</span>
                  <span>
                    R$ {discountAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ({discountPercent}%)
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Valor a Pagar:</span>
                  <span>R$ {finalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Parcelamento:</span>
                  <span>
                    {installments}x de R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
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
