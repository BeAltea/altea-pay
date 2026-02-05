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
import { toast } from "sonner"
import { SendProposalDialog } from "@/components/dashboard/send-proposal-dialog"

interface NegotiationFormProps {
  customerId: string
  companyId: string
  totalDebt: number
  customerName: string
  isSuperAdmin: boolean
  customerEmail?: string | null
  customerPhone1?: string | null
  customerPhone2?: string | null
}

export function NegotiationForm({
  customerId,
  companyId,
  totalDebt,
  customerName,
  isSuperAdmin,
  customerEmail,
  customerPhone1,
  customerPhone2,
}: NegotiationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form state
  const [discountPercent, setDiscountPercent] = useState("0")
  const [installments, setInstallments] = useState("1")
  const [paymentMethod, setPaymentMethod] = useState("boleto")
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [terms, setTerms] = useState("")
  const [observations, setObservations] = useState("")
  const [attendantName, setAttendantName] = useState("")

  // Dialog state
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [createdAgreementId, setCreatedAgreementId] = useState<string | null>(null)

  // Calculated values
  const discountAmount = (totalDebt * Number(discountPercent)) / 100
  const finalAmount = totalDebt - discountAmount
  const installmentValue = finalAmount / Number(installments)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSuperAdmin) {
        const { createAgreementSuperAdmin } = await import("@/app/actions/create-agreement-super-admin")
        const result = await createAgreementSuperAdmin({
          vmaxId: customerId,
          companyId: companyId,
          agreedAmount: finalAmount,
          installments: Number(installments),
          dueDate: dueDate,
          attendantName: attendantName || undefined,
          terms: terms || `Acordo para ${customerName} - ${installments}x de R$ ${installmentValue.toFixed(2)}`,
        })

        if (result.success && result.agreement) {
          toast.success("Proposta criada com sucesso!")
          setCreatedAgreementId(result.agreement.id)
          setTimeout(() => setShowSendDialog(true), 100)
        } else {
          toast.error("Erro ao criar proposta")
        }
      } else {
        const { createAgreementWithAsaas } = await import("@/app/actions/create-agreement-with-asaas")
        const result = await createAgreementWithAsaas({
          vmaxId: customerId,
          agreedAmount: finalAmount,
          installments: Number(installments),
          dueDate: dueDate,
          attendantName: attendantName || undefined,
          terms: terms || `Acordo para ${customerName} - ${installments}x de R$ ${installmentValue.toFixed(2)}`,
        })

        if (result.success && result.agreement) {
          toast.success("Proposta criada com sucesso!")
          setCreatedAgreementId(result.agreement.id)
          setTimeout(() => setShowSendDialog(true), 100)
        } else {
          toast.error("Erro ao criar proposta")
        }
      }
    } catch (error) {
      console.error("Error creating negotiation:", error)
      toast.error("Erro ao criar negociacao. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Proposta de Negociacao</CardTitle>
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
                <Label htmlFor="installments">Numero de Parcelas</Label>
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
                <Label htmlFor="paymentMethod">Metodo de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boleto">Boleto Bancario</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartao de Credito</SelectItem>
                    <SelectItem value="bank_transfer">Transferencia Bancaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Data de Vencimento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Data de vencimento da primeira parcela</p>
              </div>
            </div>

            {/* Attendant Name */}
            <div className="space-y-2">
              <Label htmlFor="attendantName">Atendente Responsavel</Label>
              <Input
                id="attendantName"
                placeholder="Nome do atendente que esta negociando..."
                value={attendantName}
                onChange={(e) => setAttendantName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Opcional - Nome da pessoa responsavel por essa negociacao</p>
            </div>

            {/* Terms and Observations */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="terms">Termos do Acordo</Label>
                <Textarea
                  id="terms"
                  placeholder="Descreva os termos e condicoes do acordo..."
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observacoes Internas</Label>
                <Textarea
                  id="observations"
                  placeholder="Notas internas (nao serao enviadas ao cliente)..."
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
                  <div className="flex justify-between">
                    <span>Data de Vencimento:</span>
                    <span>{new Date(dueDate + "T12:00:00").toLocaleDateString("pt-BR")}</span>
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
                {loading ? "Criando..." : "Salvar e Enviar para Cliente"}
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
              if (isSuperAdmin) {
                router.push(`/super-admin/companies/${companyId}`)
              } else {
                router.push("/dashboard/clientes")
              }
            }
          }}
          agreementId={createdAgreementId}
          customerName={customerName}
          customerEmail={customerEmail || undefined}
          customerPhone1={customerPhone1 || undefined}
          customerPhone2={customerPhone2 || undefined}
        />
      )}
    </>
  )
}
