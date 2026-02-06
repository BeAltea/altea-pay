"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Mail, MessageSquare, Send } from "lucide-react"
import { sendPaymentLink } from "@/app/actions/send-payment-link"
import { toast } from "sonner"

interface SendPaymentDialogProps {
  agreementId: string
  paymentUrl: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendPaymentDialog({ agreementId, paymentUrl, open, onOpenChange }: SendPaymentDialogProps) {
  const [sending, setSending] = useState(false)

  const handleSend = async (channel: "email" | "sms" | "whatsapp") => {
    setSending(true)
    try {
      await sendPaymentLink(agreementId, channel, {})
      toast.success(
        `Link de pagamento enviado via ${channel === "email" ? "E-mail" : channel === "whatsapp" ? "WhatsApp" : "SMS"}`,
      )
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar link de pagamento")
    } finally {
      setSending(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentUrl)
    toast.success("Link copiado para a área de transferência!")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Link de Pagamento</DialogTitle>
          <DialogDescription>Escolha como deseja enviar o link de pagamento para o cliente</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            onClick={() => handleSend("email")}
            disabled={sending}
            className="w-full justify-start"
            variant="outline"
          >
            <Mail className="mr-2 h-4 w-4" />
            Enviar por E-mail
          </Button>

          <Button
            onClick={() => handleSend("whatsapp")}
            disabled={sending}
            className="w-full justify-start"
            variant="outline"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Enviar por WhatsApp
          </Button>

          <Button
            onClick={() => handleSend("sms")}
            disabled={sending}
            className="w-full justify-start"
            variant="outline"
          >
            <Send className="mr-2 h-4 w-4" />
            Enviar por SMS
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou</span>
            </div>
          </div>

          <Button onClick={copyToClipboard} className="w-full" variant="secondary">
            Copiar Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
