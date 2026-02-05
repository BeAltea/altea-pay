"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Mail, MessageSquare, Phone, Send } from "lucide-react"
import { toast } from "sonner"

type SendChannel = "email" | "whatsapp_phone1" | "whatsapp_phone2" | "sms_phone1" | "sms_phone2"

interface SendProposalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agreementId: string
  customerName: string
  customerEmail?: string
  customerPhone1?: string
  customerPhone2?: string
}

export function SendProposalDialog({
  open,
  onOpenChange,
  agreementId,
  customerName,
  customerEmail,
  customerPhone1,
  customerPhone2,
}: SendProposalDialogProps) {
  const [sendingChannel, setSendingChannel] = useState<SendChannel>(
    customerEmail ? "email" : customerPhone1 ? "whatsapp_phone1" : customerPhone2 ? "whatsapp_phone2" : "email"
  )
  const [loading, setLoading] = useState(false)

  // Dados de contato vem DIRETO das props (que sao da VMAX)
  const email = customerEmail
  const phone1 = customerPhone1
  const phone2 = customerPhone2

  const handleSend = async () => {
    setLoading(true)

    try {
      // Map the channel to the action format and determine which phone to use
      let actionChannel: "email" | "whatsapp" | "sms" = "email"
      let selectedPhone: string | undefined

      if (sendingChannel === "whatsapp_phone1") {
        actionChannel = "whatsapp"
        selectedPhone = phone1
      } else if (sendingChannel === "whatsapp_phone2") {
        actionChannel = "whatsapp"
        selectedPhone = phone2
      } else if (sendingChannel === "sms_phone1") {
        actionChannel = "sms"
        selectedPhone = phone1
      } else if (sendingChannel === "sms_phone2") {
        actionChannel = "sms"
        selectedPhone = phone2
      }

      const { sendPaymentLink } = await import("@/app/actions/send-payment-link")
      const result = await sendPaymentLink(agreementId, actionChannel, {
        email: email,
        phone: selectedPhone || phone1 || phone2,
        customerName: customerName,
      })

      if (result.success) {
        const data = result.data as any

        if (actionChannel === "whatsapp" && data?.paymentUrl && data?.phone) {
          // Abrir WhatsApp direto com a mensagem
          const cleanPhone = data.phone.replace(/[^\d]/g, "")
          const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`
          const message = encodeURIComponent(data.message || `Ola ${customerName}! Sua proposta de acordo esta pronta. Acesse: ${data.paymentUrl}`)
          window.open(`https://wa.me/${phoneWithCountry}?text=${message}`, "_blank")
          toast.success("WhatsApp aberto com a mensagem!")
        } else if (actionChannel === "sms" && data?.paymentUrl) {
          // Copiar link para area de transferencia
          await navigator.clipboard.writeText(data.paymentUrl)
          toast.success("Link de pagamento copiado! Envie por SMS manualmente.")
        } else {
          toast.success("Proposta enviada com sucesso via E-mail!")
        }

        onOpenChange(false)
      } else {
        // Se o Resend falhou mas temos o link, mostrar opcao de copiar
        const paymentUrl = (result as any).paymentUrl
        if (paymentUrl) {
          await navigator.clipboard.writeText(paymentUrl)
          toast.error(result.error || "Erro ao enviar", {
            description: "O link de pagamento foi copiado para a area de transferencia.",
            duration: 8000,
          })
        } else {
          toast.error(result.error || "Erro ao enviar proposta")
        }
      }
    } catch (error) {
      console.error("Error sending proposal:", error)
      toast.error("Erro ao enviar proposta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const ChannelOption = ({
    value,
    icon: Icon,
    label,
    detail,
    disabled,
  }: {
    value: SendChannel
    icon: typeof Mail
    label: string
    detail: string
    disabled?: boolean
  }) => (
    <div
      className={`flex items-center gap-3 border rounded-lg p-4 transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-muted/30"
          : sendingChannel === value
            ? "border-primary bg-primary/5 cursor-pointer"
            : "border-border hover:border-primary/50 cursor-pointer"
      }`}
      onClick={() => !disabled && setSendingChannel(value)}
    >
      <RadioGroupItem value={value} id={value} disabled={disabled} />
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <Label htmlFor={value} className={`font-medium ${disabled ? "" : "cursor-pointer"}`}>
          {label}
        </Label>
        <p className="text-sm text-muted-foreground truncate">{detail}</p>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Proposta para o Cliente</DialogTitle>
          <DialogDescription>
            Escolha o canal de comunicacao para enviar a proposta de acordo para {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
            <RadioGroup value={sendingChannel} onValueChange={(value) => setSendingChannel(value as SendChannel)}>
              <div className="space-y-3">
                {/* Email option */}
                <ChannelOption
                  value="email"
                  icon={Mail}
                  label="E-mail"
                  detail={email || "Nenhum e-mail cadastrado"}
                  disabled={!email}
                />

                {/* WhatsApp - Telefone 1 */}
                <ChannelOption
                  value="whatsapp_phone1"
                  icon={MessageSquare}
                  label="WhatsApp - Telefone 1"
                  detail={phone1 || "Nenhum telefone 1 cadastrado"}
                  disabled={!phone1}
                />

                {/* WhatsApp - Telefone 2 */}
                {phone2 && (
                  <ChannelOption
                    value="whatsapp_phone2"
                    icon={MessageSquare}
                    label="WhatsApp - Telefone 2"
                    detail={phone2}
                  />
                )}

                {/* SMS - Telefone 1 */}
                <ChannelOption
                  value="sms_phone1"
                  icon={Phone}
                  label="SMS - Telefone 1"
                  detail={phone1 || "Nenhum telefone 1 cadastrado"}
                  disabled={!phone1}
                />

                {/* SMS - Telefone 2 */}
                {phone2 && (
                  <ChannelOption
                    value="sms_phone2"
                    icon={Phone}
                    label="SMS - Telefone 2"
                    detail={phone2}
                  />
                )}
              </div>
            </RadioGroup>

          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
            <p>
              O cliente recebera um link de pagamento gerado pelo Asaas com os detalhes completos do acordo e as opcoes
              de pagamento.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Enviando..." : "Enviar Proposta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
