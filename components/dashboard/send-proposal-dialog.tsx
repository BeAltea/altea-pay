"use client"

import { useState, useEffect } from "react"
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
  const [email, setEmail] = useState(customerEmail)
  const [phone1, setPhone1] = useState(customerPhone1)
  const [phone2, setPhone2] = useState(customerPhone2)
  const [fetchingContacts, setFetchingContacts] = useState(false)

  useEffect(() => {
    async function fetchCustomerContacts() {
      if (!agreementId) return
      // If we already have all data passed as props, no need to fetch
      if (email && phone1) return

      setFetchingContacts(true)
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()

        // Buscar agreement com customer.external_id (= VMAX id)
        const { data: agreement } = await supabase
          .from("agreements")
          .select("customer_id, customers(external_id)")
          .eq("id", agreementId)
          .single()

        if (agreement) {
          const vmaxId = (agreement.customers as any)?.external_id
          
          if (vmaxId) {
            // Buscar VMAX pelo ID - UNICA fonte de dados
            const { data: vmaxRecord } = await supabase
              .from("VMAX")
              .select('Email, "Telefone 1", "Telefone 2"')
              .eq("id", vmaxId)
              .single()

            if (vmaxRecord) {
              if (!email) setEmail(vmaxRecord.Email || undefined)
              if (!phone1) setPhone1(vmaxRecord["Telefone 1"] || undefined)
              if (!phone2) setPhone2(vmaxRecord["Telefone 2"] || undefined)
            }
          }
        }
      } catch (error) {
        console.error("Error fetching customer contacts:", error)
      } finally {
        setFetchingContacts(false)
      }
    }

    if (open) {
      fetchCustomerContacts()
    }
  }, [open, agreementId, email, phone1])

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
      const result = await sendPaymentLink(agreementId, actionChannel, selectedPhone)

      if (result.success) {
        const channelLabel = actionChannel === "email" ? "E-mail" : actionChannel === "whatsapp" ? "WhatsApp" : "SMS"
        toast.success(`Proposta enviada com sucesso via ${channelLabel}!`)
        onOpenChange(false)
      } else {
        toast.error(result.error || "Erro ao enviar proposta")
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
          {fetchingContacts ? (
            <div className="text-center text-muted-foreground">Carregando informacoes de contato...</div>
          ) : (
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
          )}

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
          <Button onClick={handleSend} disabled={loading || fetchingContacts}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Enviando..." : "Enviar Proposta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
