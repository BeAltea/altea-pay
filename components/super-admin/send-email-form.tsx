"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Users,
  Mail,
  Eye,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  CheckSquare,
  Square,
} from "lucide-react"

interface Company {
  id: string
  name: string
}

interface Recipient {
  id: string
  name: string
  email: string
}

interface SendEmailFormProps {
  companies: Company[]
  recipientsMap: Record<string, Recipient[]>
}

export function SendEmailForm({ companies, recipientsMap }: SendEmailFormProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("")
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set())
  const [subject, setSubject] = useState("")
  const [htmlBody, setHtmlBody] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Get recipients for selected company
  const companyRecipients = useMemo(() => {
    if (!selectedCompanyId) return []
    return recipientsMap[selectedCompanyId] || []
  }, [selectedCompanyId, recipientsMap])

  // Filter recipients based on search
  const filteredRecipients = useMemo(() => {
    if (!searchTerm) return companyRecipients
    const lowerSearch = searchTerm.toLowerCase()
    return companyRecipients.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerSearch) ||
        r.email.toLowerCase().includes(lowerSearch),
    )
  }, [companyRecipients, searchTerm])

  // Get selected recipients' emails
  const selectedEmails = useMemo(() => {
    return companyRecipients.filter((r) => selectedRecipientIds.has(r.id)).map((r) => r.email)
  }, [companyRecipients, selectedRecipientIds])

  // Handle company change
  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId)
    setSelectedRecipientIds(new Set())
    setSearchTerm("")
  }

  // Handle select all
  const handleSelectAll = () => {
    const allIds = new Set(companyRecipients.map((r) => r.id))
    setSelectedRecipientIds(allIds)
  }

  // Handle deselect all
  const handleDeselectAll = () => {
    setSelectedRecipientIds(new Set())
  }

  // Handle individual recipient toggle
  const handleRecipientToggle = (recipientId: string) => {
    const newSelected = new Set(selectedRecipientIds)
    if (newSelected.has(recipientId)) {
      newSelected.delete(recipientId)
    } else {
      newSelected.add(recipientId)
    }
    setSelectedRecipientIds(newSelected)
  }

  // Validate form
  const isFormValid = selectedCompanyId && selectedRecipientIds.size > 0 && subject.trim() && htmlBody.trim()

  // Handle send
  const handleSend = async () => {
    if (!isFormValid) return

    setIsSending(true)
    setResult(null)

    try {
      const response = await fetch("/api/super-admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: selectedCompanyId,
          recipientEmails: selectedEmails,
          subject,
          htmlBody,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({ success: false, message: data.error || "Erro ao enviar email" })
      } else {
        setResult({ success: true, message: data.message || "Emails enviados com sucesso!" })
        // Reset form on success
        setSelectedRecipientIds(new Set())
        setSubject("")
        setHtmlBody("")
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Erro de conexão",
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Result Alert */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      {/* Company Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Selecionar Empresa
          </CardTitle>
          <CardDescription>Escolha a empresa cujos clientes receberão o email</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompanyId} onValueChange={handleCompanyChange}>
            <SelectTrigger className="w-full md:w-[400px]">
              <SelectValue placeholder="Selecione uma empresa..." />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Recipient Selection */}
      {selectedCompanyId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Selecionar Destinatários
                </CardTitle>
                <CardDescription>
                  {companyRecipients.length} destinatário(s) cadastrado(s)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedRecipientIds.size} selecionado(s)
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyRecipients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum destinatário cadastrado para esta empresa.</p>
                <p className="text-sm mt-2">Importe destinatários na tabela company_email_recipients.</p>
              </div>
            ) : (
              <>
                {/* Quick Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                    className="gap-2"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Selecionar Todos ({companyRecipients.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={selectedRecipientIds.size === 0}
                    className="gap-2"
                  >
                    <Square className="h-4 w-4" />
                    Desmarcar Todos
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Recipient List */}
                <ScrollArea className="h-[300px] rounded-md border">
                  <div className="p-4 space-y-2">
                    {filteredRecipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => handleRecipientToggle(recipient.id)}
                      >
                        <Checkbox
                          checked={selectedRecipientIds.has(recipient.id)}
                          onCheckedChange={() => handleRecipientToggle(recipient.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{recipient.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {recipient.email}
                          </p>
                        </div>
                      </div>
                    ))}
                    {filteredRecipients.length === 0 && searchTerm && (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhum destinatário encontrado para &quot;{searchTerm}&quot;
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email Composition */}
      {selectedRecipientIds.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Compor Email
            </CardTitle>
            <CardDescription>
              Escreva o conteúdo do email que será enviado para {selectedRecipientIds.size}{" "}
              destinatário(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                placeholder="Digite o assunto do email..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Corpo do Email (HTML)</Label>
              <Textarea
                id="body"
                placeholder="<p>Digite o conteúdo do email em HTML...</p>"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Use tags HTML para formatar o email. Ex: &lt;p&gt;, &lt;strong&gt;, &lt;a
                href=&quot;...&quot;&gt;
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                disabled={!htmlBody.trim()}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Visualizar
              </Button>
              <Button
                onClick={handleSend}
                disabled={!isFormValid || isSending}
                className="gap-2"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSending ? "Enviando..." : `Enviar para ${selectedRecipientIds.size} destinatário(s)`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Email</DialogTitle>
            <DialogDescription>
              Veja como o email será exibido para os destinatários
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Assunto:</p>
                <p className="font-medium">{subject || "(sem assunto)"}</p>
              </div>
              <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: htmlBody || "<p>(sem conteúdo)</p>" }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
