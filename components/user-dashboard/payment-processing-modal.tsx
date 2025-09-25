"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CreditCard, QrCode, FileText, CheckCircle, Clock, Copy, Download, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface PaymentProcessingModalProps {
  isOpen: boolean
  onClose: () => void
  debt: {
    id: string
    description: string
    amount: string
    due_date: string
  }
}

export function PaymentProcessingModal({ isOpen, onClose, debt }: PaymentProcessingModalProps) {
  console.log("[v0] PaymentProcessingModal - Component rendered, isOpen:", isOpen, "debt:", debt.id)

  const [step, setStep] = useState<"method" | "processing" | "success">("method")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [installments, setInstallments] = useState("1")
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pixCode, setPixCode] = useState("")
  const [boletoCode, setBoletoCode] = useState("")
  const router = useRouter()

  const amount = Number(debt.amount)
  const installmentValue = amount / Number(installments)

  useEffect(() => {
    if (isOpen) {
      setStep("method")
      setPaymentMethod("")
      setInstallments("1")
      setIsProcessing(false)
      setProgress(0)
      setPixCode("")
      setBoletoCode("")
      console.log("[v0] PaymentProcessingModal - Modal state reset")
    }
  }, [isOpen])

  const handlePaymentSubmit = async () => {
    console.log("[v0] PaymentProcessingModal - Payment submit clicked, method:", paymentMethod)

    if (!paymentMethod) {
      toast({
        title: "Método de pagamento obrigatório",
        description: "Por favor, selecione um método de pagamento antes de continuar.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setStep("processing")
    setProgress(0)

    // Simulate payment processing with progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      // Generate payment codes based on method
      if (paymentMethod === "pix") {
        setPixCode(
          `00020126580014BR.GOV.BCB.PIX0136${debt.id}-${Date.now()}5204000053039865802BR5925ALTEA PAY COBRANCAS LTDA6009SAO PAULO62070503***6304${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        )
      } else if (paymentMethod === "boleto") {
        setBoletoCode(
          `34191.79001 01043.510047 91020.150008 ${Math.floor(Math.random() * 9) + 1} ${Math.floor(Date.now() / 1000)}`,
        )
      }

      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const supabase = createClient()

      // Create payment record (simulated)
      console.log("[v0] PaymentProcessingModal - Creating payment record for debt:", debt.id)

      // Simulate successful payment creation
      const mockPaymentRecord = {
        debt_id: debt.id,
        amount: debt.amount,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: paymentMethod,
        status: paymentMethod === "cartao" ? "completed" : "pending",
        transaction_id: `${paymentMethod.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      }

      console.log("[v0] PaymentProcessingModal - Mock payment record created:", mockPaymentRecord)

      setProgress(100)
      setTimeout(() => {
        setStep("success")
        setIsProcessing(false)

        // Show success toast
        toast({
          title: "Pagamento processado!",
          description:
            paymentMethod === "cartao"
              ? "Seu pagamento foi aprovado com sucesso!"
              : `Código ${paymentMethod === "pix" ? "PIX" : "do boleto"} gerado com sucesso!`,
        })
      }, 500)
    } catch (error) {
      console.error("Error processing payment:", error)
      toast({
        title: "Erro no pagamento",
        description: "Ocorreu um erro ao processar o pagamento. Tente novamente.",
        variant: "destructive",
      })
      setIsProcessing(false)
      setStep("method")
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Copiado!",
          description: `Código ${type} copiado para a área de transferência`,
        })
      })
      .catch(() => {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o código. Tente novamente.",
          variant: "destructive",
        })
      })
  }

  const handleClose = () => {
    console.log("[v0] PaymentProcessingModal - Close handler called")
    setStep("method")
    setPaymentMethod("")
    setInstallments("1")
    setProgress(0)
    setPixCode("")
    setBoletoCode("")
    onClose()

    if (step === "success") {
      setTimeout(() => {
        router.refresh()
      }, 100)
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isProcessing) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, isProcessing])

  console.log("[v0] PaymentProcessingModal - Current state:", { step, paymentMethod, isProcessing, progress })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        console.log("[v0] PaymentProcessingModal - Dialog state changed to:", open)
        if (!open && !isProcessing) {
          handleClose()
        }
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === "method" && "Escolha a forma de pagamento"}
            {step === "processing" && "Processando pagamento..."}
            {step === "success" && "Pagamento processado!"}
          </DialogTitle>
          <DialogDescription>
            {step === "method" && "Selecione como deseja pagar sua dívida"}
            {step === "processing" && "Aguarde enquanto processamos seu pagamento"}
            {step === "success" && "Seu pagamento foi processado com sucesso"}
          </DialogDescription>
        </DialogHeader>

        {step === "method" && (
          <div className="space-y-6">
            {/* Debt Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{debt.description}</CardTitle>
                <CardDescription>Vencimento: {new Date(debt.due_date).toLocaleDateString("pt-BR")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <div className="space-y-4">
              <Label>Forma de Pagamento</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${paymentMethod === "pix" ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  onClick={() => {
                    setPaymentMethod("pix")
                    console.log("[v0] PaymentProcessingModal - PIX selected")
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <QrCode className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">PIX</div>
                    <div className="text-sm text-gray-500">Instantâneo</div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${paymentMethod === "boleto" ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  onClick={() => {
                    setPaymentMethod("boleto")
                    console.log("[v0] PaymentProcessingModal - Boleto selected")
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">Boleto</div>
                    <div className="text-sm text-gray-500">1-2 dias úteis</div>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${paymentMethod === "cartao" ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                  onClick={() => {
                    setPaymentMethod("cartao")
                    console.log("[v0] PaymentProcessingModal - Credit card selected")
                  }}
                >
                  <CardContent className="p-4 text-center">
                    <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">Cartão</div>
                    <div className="text-sm text-gray-500">Parcelável</div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Installments for Credit Card */}
            {paymentMethod === "cartao" && (
              <div className="space-y-2">
                <Label>Número de Parcelas</Label>
                <Select value={installments} onValueChange={setInstallments}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 10, 12].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}x de R$ {installmentValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        {num === 1 ? " (à vista)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={handlePaymentSubmit}
                disabled={!paymentMethod || isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Continuar Pagamento"
                )}
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Processando seu pagamento</h3>
              <p className="text-gray-600 mb-4">
                {paymentMethod === "pix" && "Gerando código PIX..."}
                {paymentMethod === "boleto" && "Gerando boleto bancário..."}
                {paymentMethod === "cartao" && "Processando pagamento no cartão..."}
              </p>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-gray-500 mt-2">{progress}% concluído</p>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-700 mb-2">
                {paymentMethod === "cartao" ? "Pagamento Aprovado!" : "Código Gerado!"}
              </h3>
              <p className="text-gray-600">
                {paymentMethod === "pix" && "Use o código PIX abaixo para finalizar o pagamento"}
                {paymentMethod === "boleto" && "Use o código de barras abaixo para pagar o boleto"}
                {paymentMethod === "cartao" && "Seu pagamento foi processado com sucesso"}
              </p>
            </div>

            {/* PIX Code */}
            {paymentMethod === "pix" && pixCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Código PIX
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded font-mono text-sm break-all">{pixCode}</div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => copyToClipboard(pixCode, "PIX")} className="flex-1">
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Código
                    </Button>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Instruções</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Abra o app do seu banco, escolha PIX, cole o código e confirme o pagamento.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Boleto Code */}
            {paymentMethod === "boleto" && boletoCode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Código de Barras
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded font-mono text-sm">{boletoCode}</div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(boletoCode, "do boleto")}
                      className="flex-1"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Código
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast({
                          title: "Download simulado",
                          description: "Em um ambiente real, o PDF do boleto seria baixado aqui.",
                        })
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded">
                    <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">Vencimento</span>
                    </div>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      Este boleto vence em 3 dias úteis. Pague em qualquer banco ou lotérica.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Credit Card Success */}
            {paymentMethod === "cartao" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagamento Aprovado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Valor:</span>
                      <span className="font-medium">
                        R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Parcelas:</span>
                      <span className="font-medium">{installments}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge className="bg-green-100 text-green-800">Aprovado</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleClose} className="w-full bg-blue-600 hover:bg-blue-700">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
