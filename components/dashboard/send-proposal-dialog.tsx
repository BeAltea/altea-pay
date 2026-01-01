"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Mail, MessageSquare, Send } from "lucide-react"
import { toast } from "sonner"

interface SendProposalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agreementId: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
}

export function SendProposalDialog({
  open,
  onOpenChange,
  agreementId,
  customerName,
  customerEmail,
  customerPhone,
}: SendProposalDialogProps) {
  const [sendingChannel, setSendingChannel] = useState<"email" | "whatsapp" | "sms">("email")
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(customerEmail)
  const [phone, setPhone] = useState(customerPhone)
  const [fetchingContacts, setFetchingContacts] = useState(false)

  useEffect(() => {
    async function fetchCustomerContacts() {
      if (!agreementId || (email && phone)) return

      setFetchingContacts(true)
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()

        const { data: agreement } = await supabase
          .from("agreements")
          .select("customer_id, customers:customer_id(document, email, phone)")
          .eq("id", agreementId)
          .single()

        if (agreement) {
          const customer = agreement.customers as any
          let customerEmail = customer?.email
          let customerPhone = customer?.phone

          // If customer data is missing, try to get from VMAX
          if (!customerEmail || !customerPhone) {
            const cleanedDocument = customer?.document?.replace(/[^\d]/g, "") || ""

            const { data: vmaxRecord } = await supabase
              .from("VMAX")
              .select("Email, Telefone")
              .eq('"CPF/CNPJ"', cleanedDocument)
              .single()

            if (vmaxRecord) {
              customerEmail = customerEmail || vmaxRecord.Email
              customerPhone = customerPhone || vmaxRecord.Telefone
            }
          }

          setEmail(customerEmail)
          setPhone(customerPhone)
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
  }, [open, agreementId, email, phone])

  const handleSend = async () => {
    setLoading(true)

    try {
      const { sendPaymentLink } = await import("@/app/actions/send-payment-link")
      const result = await sendPaymentLink(agreementId, sendingChannel)

      if (result.success) {
        toast.success(
          `Proposta enviada com sucesso via ${sendingChannel === "email" ? "E-mail" : sendingChannel === "whatsapp" ? "WhatsApp" : "SMS"}!`,
        )
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Proposta para o Cliente</DialogTitle>
          <DialogDescription>
            Escolha o canal de comunicação para enviar a proposta de acordo para {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {fetchingContacts ? (
            <div className="text-center text-muted-foreground">Carregando informações de contato...</div>
          ) : (
            <RadioGroup value={sendingChannel} onValueChange={(value) => setSendingChannel(value as any)}>
              <div className="space-y-3">
                <div
                  className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                    sendingChannel === "email" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSendingChannel("email")}
                >
                  <RadioGroupItem value="email" id="email" />
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="email" className="cursor-pointer font-medium">
                      E-mail
                    </Label>
                    <p className="text-sm text-muted-foreground">{email || "Nenhum e-mail cadastrado"}</p>
                  </div>
                </div>

                <div
                  className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                    sendingChannel === "whatsapp"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSendingChannel("whatsapp")}
                >
                  <RadioGroupItem value="whatsapp" id="whatsapp" />
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="whatsapp" className="cursor-pointer font-medium">
                      WhatsApp
                    </Label>
                    <p className="text-sm text-muted-foreground">{phone || "Nenhum telefone cadastrado"}</p>
                  </div>
                </div>

                <div
                  className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                    sendingChannel === "sms" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSendingChannel("sms")}
                >
                  <RadioGroupItem value="sms" id="sms" />
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="sms" className="cursor-pointer font-medium">
                      SMS
                    </Label>
                    <p className="text-sm text-muted-foreground">{phone || "Nenhum telefone cadastrado"}</p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          )}

          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">
            <p>
              O cliente receberá um link de pagamento gerado pelo Asaas com os detalhes completos do acordo e as opções
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
