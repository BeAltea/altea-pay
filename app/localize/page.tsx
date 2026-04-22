"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Phone, Mail, MapPin, User, Building2, LogOut, CheckCircle2, XCircle, MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { LocalizeResult } from "@/services/assertivaLocalizeService"

// Server action import (to be created in Phase 2)
import { consultarDocumentoAction } from "@/app/actions/localize-action"

export default function LocalizePage() {
  const [documento, setDocumento] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LocalizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!documento.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await consultarDocumentoAction(documento)
      setResult(data)
      if (!data.success && data.error) {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message || "Erro ao consultar documento")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const formatDocument = (doc: string, type: "cpf" | "cnpj") => {
    const clean = doc.replace(/\D/g, "")
    if (type === "cpf" && clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }
    if (type === "cnpj" && clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    }
    return doc
  }

  const formatPhone = (phone: string) => {
    const clean = phone.replace(/\D/g, "")
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    }
    return phone
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Assertiva Localize</h1>
              <p className="text-sm text-slate-500">Powered by AlteaPay</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Search Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Consulta de Documento</CardTitle>
            <CardDescription>
              Digite um CPF ou CNPJ para localizar dados cadastrais, telefones e emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                type="text"
                placeholder="Digite o CPF ou CNPJ..."
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !documento.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Consultando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Consultar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700">
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && result.success && (
          <div className="space-y-6">
            {/* Header Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.documentType === "cpf" ? (
                      <User className="w-6 h-6 text-blue-600" />
                    ) : (
                      <Building2 className="w-6 h-6 text-indigo-600" />
                    )}
                    <div>
                      <CardTitle className="text-lg">{result.name || "Nome não disponível"}</CardTitle>
                      <CardDescription>
                        {result.documentType.toUpperCase()}: {formatDocument(result.document, result.documentType)}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Localizado
                  </Badge>
                </div>
              </CardHeader>
              {result.protocolo && (
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-500">Protocolo: {result.protocolo}</p>
                </CardContent>
              )}
            </Card>

            {/* Best Phone */}
            {result.phones.best && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    Melhor Telefone
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="text-xl font-semibold text-green-800">
                        {formatPhone(result.phones.best.numero)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {result.phones.best.tipo === "movel" ? "Celular" : "Fixo"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {result.phones.best.relacao}
                        </Badge>
                        {result.phones.best.hotphone && (
                          <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200">
                            Hotphone
                          </Badge>
                        )}
                        {result.phones.best.whatsapp && (
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            WhatsApp
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Phones */}
            {(result.phones.allMoveis.length > 0 || result.phones.allFixos.length > 0) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Todos os Telefones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Mobile Phones */}
                    {result.phones.allMoveis.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Celulares ({result.phones.allMoveis.length})</p>
                        <div className="space-y-2">
                          {result.phones.allMoveis.map((phone, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                phone.naoPerturbe ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono">{formatPhone(phone.numero)}</span>
                                <div className="flex gap-1">
                                  {phone.whatsapp && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                      <MessageCircle className="w-3 h-3 mr-1" />
                                      WhatsApp
                                    </Badge>
                                  )}
                                  {phone.hotphone && (
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                                      Hotphone
                                    </Badge>
                                  )}
                                  {phone.naoPerturbe && (
                                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                                      Nao Perturbe
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-slate-500">{phone.relacao}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Landline Phones */}
                    {result.phones.allFixos.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-slate-600 mb-2">Fixos ({result.phones.allFixos.length})</p>
                        <div className="space-y-2">
                          {result.phones.allFixos.map((phone, i) => (
                            <div
                              key={i}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                phone.naoPerturbe ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono">{formatPhone(phone.numero)}</span>
                                {phone.naoPerturbe && (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                                    Nao Perturbe
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">{phone.relacao}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Emails */}
            {result.emails.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Emails ({result.emails.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.emails.map((email, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          i === 0 ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className="font-mono text-sm">{email}</span>
                        {i === 0 && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                            Principal
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Data Found */}
            {result.phones.allMoveis.length === 0 &&
              result.phones.allFixos.length === 0 &&
              result.emails.length === 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 text-yellow-700">
                      <XCircle className="w-5 h-5" />
                      <span>Nenhum telefone ou email encontrado para este documento.</span>
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        )}

        {/* Empty State */}
        {!result && !error && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 mb-2">Pronto para consultar</h3>
            <p className="text-slate-500">Digite um CPF ou CNPJ acima para localizar dados cadastrais</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
          Dados fornecidos por Assertiva Solucoes
        </div>
      </footer>
    </div>
  )
}
