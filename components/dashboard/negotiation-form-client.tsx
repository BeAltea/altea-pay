"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Percent, Save } from "lucide-react"
import { createAgreementWithAsaas } from "@/app/actions/create-agreement-with-asaas"
import { toast } from "sonner"
import { SendProposalDialog } from "./send-proposal-dialog"

interface Customer {
  id: string
  name: string
  cpf: string
  debtAmount: number
  daysOverdue: number
  email?: string | null
  phone1?: string | null
  phone2?: string | null
}

export function NegotiationFormClient({ customer }: { customer: Customer }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [createdAgreementId, setCreatedAgreementId] = useState<string | null>(null)

  // Form state
  const [discountPercent, setDiscountPercent] = useState("0")
  const [installments, setInstallments] = useState("1")
  const [paymentMethod, setPaymentMethod] = useState("boleto")
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
  const [terms, setTerms] = useState("")
  const [observations, setObservations] = useState("")
  const [attendantName, setAttendantName] = useState("")

  // Calculated values
  const discountAmount = (customer.debtAmount * Number(discountPercent)) / 100
  const finalAmount = customer.debtAmount - discountAmount
  const installmentValue = finalAmount / Number(installments)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createAgreementWithAsaas({
        vmaxId: customer.id,
        agreedAmount: finalAmount,
        installments: Number(installments),
        dueDate: dueDate,
        attendantName: attendantName || undefined,
        terms: terms || `Acordo para ${customer.name} - ${installments}x de R$ ${installmentValue.toFixed(2)}`,
      })

      if (result.success && result.agreement) {
        toast.success("Proposta criada com sucesso!")
        setCreatedAgreementId(result.agreement.id)
        setTimeout(() => setShowSendDialog(true), 100)
      } else {
        toast.error("Erro ao criar proposta")
      }
    } catch (error: any) {
      console.error("Error creating negotiation:", error)
      toast.error(error.message || "Erro ao criar proposta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Client Information Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dados do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={customer.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input value={customer.cpf} disabled />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor da Dívida</Label>
                <Input
                  value={`R$ ${customer.debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label>Dias em Atraso</Label>
                <Input value={`${customer.daysOverdue} dias`} disabled className="text-red-600 font-medium" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Negotiation Proposal Card */}
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
                  value={`R$ ${customer.debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
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
                <Input
                  value={`R$ ${installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  disabled
                />
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

              {/* Due Date Field */}
              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
                <p className="text-xs text-muted-foreground">Data de vencimento da primeira parcela</p>
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
                    <span className="font-semibold">{customer.name}</span>
                  </div>
                  {attendantName && (
                    <div className="flex justify-between">
                      <span>Atendente:</span>
                      <span className="font-semibold">{attendantName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Valor Original:</span>
                    <span>R$ {customer.debtAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
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
                  <div className="flex justify-between">
                    <span>Data de Vencimento:</span>
                    <span>{new Date(dueDate).toLocaleDateString("pt-BR")}</span>
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
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Salvando..." : "Salvar e Enviar para Cliente"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {createdAgreementId && (
        <SendProposalDialog
          open={showSendDialog}
          onOpenChange={(open) => {
            setShowSendDialog(open)
            if (!open) {
              router.push("/dashboard/clientes")
            }
          }}
          agreementId={createdAgreementId}
          customerName={customer.name}
          customerEmail={customer.email || undefined}
          customerPhone1={customer.phone1 || undefined}
          customerPhone2={customer.phone2 || undefined}
        />
      )}
    </>
  )
}
