"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Mail, MessageSquare, Send } from "lucide-react"
import { toast } from "sonner"
import { sendProposal } from "@/app/actions/send-proposal"

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

  const handleSend = async () => {
    setLoading(true)

    try {
      const result = await sendProposal(agreementId, sendingChannel)

      if (result.success) {
        toast.success(
          `Proposta enviada via ${sendingChannel === "email" ? "E-mail" : sendingChannel === "whatsapp" ? "WhatsApp" : "SMS"}!`,
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
          <RadioGroup value={sendingChannel} onValueChange={(value) => setSendingChannel(value as any)}>
            <div className="space-y-3">
              {/* Email Option */}
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
                  <p className="text-sm text-muted-foreground">{customerEmail || "Nenhum e-mail cadastrado"}</p>
                </div>
              </div>

              {/* WhatsApp Option */}
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
                  <p className="text-sm text-muted-foreground">{customerPhone || "Nenhum telefone cadastrado"}</p>
                </div>
              </div>

              {/* SMS Option */}
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
                  <p className="text-sm text-muted-foreground">{customerPhone || "Nenhum telefone cadastrado"}</p>
                </div>
              </div>
            </div>
          </RadioGroup>

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
          <Button onClick={handleSend} disabled={loading}>
            <Send className="w-4 h-4 mr-2" />
            {loading ? "Enviando..." : "Enviar Proposta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
