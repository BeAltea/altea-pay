import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { ArrowRight, CheckCircle, Zap, Shield, CreditCard, BarChart3, Lock, Code } from "lucide-react"
import { RecoveryRedirect } from "@/components/auth/recovery-redirect"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Componente para detectar e redirecionar tokens de recovery do Supabase */}
      <RecoveryRedirect />
      {/* Header */}
      <header className="bg-altea-navy text-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-altea-gold p-2 rounded-lg">
              <div className="h-6 w-6 bg-altea-navy rounded-sm flex items-center justify-center">
                <span className="text-altea-gold font-bold text-sm">A</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Altea Pay</h1>
          </div>
          <nav className="hidden lg:flex items-center space-x-8">
            <a href="#solucoes" className="hover:text-altea-gold transition-colors cursor-pointer">
              Soluções
            </a>
            <a href="#contato" className="hover:text-altea-gold transition-colors cursor-pointer">
              Contato
            </a>
            <a href="#newsletter" className="hover:text-altea-gold transition-colors cursor-pointer">
              Novidades
            </a>
          </nav>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/auth/login">
              <Button
                variant="ghost"
                className="text-white hover:text-altea-gold hover:bg-transparent text-sm sm:text-base px-2 sm:px-4"
              >
                Entrar
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-altea-gold text-altea-navy hover:bg-altea-gold/90 text-sm sm:text-base px-2 sm:px-4">
                Cadastrar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-altea-navy text-white py-12 sm:py-16 lg:py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 text-balance">
                Análise que prevê, <span className="text-altea-gold">experiências que pagam</span>, do seu jeito
              </h2>
              <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-blue-100 text-pretty">
                Com IA e dados comportamentais, orquestramos Pix, cartão, débito, recorrência, crédito via fatura e
                cashback de forma personalizada para elevar a taxa de recuperação com compliance total (ANEEL, BACEN,
                LGPD).
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-altea-gold text-altea-navy hover:bg-altea-gold/90 cursor-pointer w-full sm:w-auto"
                >
                  Receber convites
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-altea-navy cursor-pointer bg-transparent w-full sm:w-auto"
                >
                  Tirar uma dúvida
                </Button>
              </div>
            </div>

            {/* Blocos de Destaque */}
            <div className="space-y-4 mt-8 lg:mt-0">
              <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-altea-gold p-2 rounded-lg">
                      <Zap className="h-5 w-5 text-altea-navy" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Engine preditiva + checkout omnichannel</h3>
                      <p className="text-blue-100 text-sm">
                        Quem pagar, quanto, quando e como — tudo decidido em tempo real.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-altea-gold p-2 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-altea-navy" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Segmentação preditiva e ofertas sob medida</h3>
                      <p className="text-blue-100 text-sm">
                        Recupere antes, com menos custo e melhor experiência do usuário.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-altea-gold p-2 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-altea-navy" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Do insight ao pagamento</h3>
                      <p className="text-blue-100 text-sm">
                        one-click Pix, parcelamento, recorrência e incentivos configurados por perfil.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 border-white/20 text-white backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-altea-gold p-2 rounded-lg">
                      <Code className="h-5 w-5 text-altea-navy" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">API</h3>
                      <p className="text-blue-100 text-sm">
                        Integração nativa com ERPs de utilities e antifraude para uma cobrança mais inteligente, fluida
                        e rentável.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Soluções Altea Pay */}
      <section id="solucoes" className="py-12 sm:py-16 lg:py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h3 className="text-3xl sm:text-4xl font-bold text-altea-navy mb-4">Soluções Altea Pay</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-blue-100 p-3 rounded-lg w-fit">
                  <CreditCard className="h-6 w-6 text-altea-navy" />
                </div>
                <CardTitle className="text-altea-navy">Checkout Inteligente</CardTitle>
                <CardDescription>Otimização de conversão, 3-DS, suporte a carteiras e cartões.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-green-100 p-3 rounded-lg w-fit">
                  <BarChart3 className="h-6 w-6 text-altea-navy" />
                </div>
                <CardTitle className="text-altea-navy">Gestão de Recebíveis</CardTitle>
                <CardDescription>Antecipação, conciliação, relatórios e dashboards de liquidação.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-purple-100 p-3 rounded-lg w-fit">
                  <Zap className="h-6 w-6 text-altea-navy" />
                </div>
                <CardTitle className="text-altea-navy">PIX, Boleto e Links</CardTitle>
                <CardDescription>
                  Cobrança multi-métodos com QR dinâmico, códigos de barras e links de pagamento.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-orange-100 p-3 rounded-lg w-fit">
                  <Code className="h-6 w-6 text-altea-navy" />
                </div>
                <CardTitle className="text-altea-navy">API & SDKs</CardTitle>
                <CardDescription>
                  Integração flexível, webhooks confiáveis e exemplos em múltiplas linguagens.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-red-100 p-3 rounded-lg w-fit">
                  <Shield className="h-6 w-6 text-altea-navy" />
                </div>
                <CardTitle className="text-altea-navy">Segurança & Compliance</CardTitle>
                <CardDescription>Boas práticas, LGPD, tokenização e prevenção a fraude.</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="bg-teal-100 p-3 rounded-lg w-fit">
                  <Lock className="h-6 w-6 text-altea-navy" />
                </div>
                <CardTitle className="text-altea-navy">Acesso ao Sistema</CardTitle>
                <CardDescription>
                  <Link href="/auth/login" className="text-altea-gold hover:underline cursor-pointer">
                    Faça login para acessar o sistema de cobrança automática
                  </Link>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section id="newsletter" className="py-12 sm:py-16 lg:py-20 px-4 bg-altea-navy text-white">
        <div className="container mx-auto text-center">
          <h3 className="text-2xl sm:text-3xl font-bold mb-4">Receba novidades da Altea Pay</h3>
          <p className="text-blue-100 mb-6 sm:mb-8 text-sm sm:text-base">
            Cadastre seu e-mail para receber novidades, lançamentos e conteúdos. Sem spam.
          </p>

          <div className="max-w-md mx-auto space-y-4">
            <Input type="email" placeholder="Seu melhor e-mail" className="bg-white text-altea-navy border-0" />
            <div className="flex items-start space-x-2 text-sm">
              <Checkbox
                id="privacy"
                className="border-white data-[state=checked]:bg-altea-gold data-[state=checked]:border-altea-gold mt-0.5"
              />
              <label htmlFor="privacy" className="text-blue-100 cursor-pointer text-left">
                Concordo com o tratamento dos meus dados conforme a Política de Privacidade
              </label>
            </div>
            <Button className="w-full bg-altea-gold text-altea-navy hover:bg-altea-gold/90 cursor-pointer">
              Quero receber
            </Button>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-12 sm:py-16 lg:py-20 px-4 bg-white">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <h3 className="text-3xl sm:text-4xl font-bold text-altea-navy mb-4">Fale com a gente</h3>
              <p className="text-base sm:text-lg text-gray-600 mb-2">
                Envie sua dúvida — respondemos o quanto antes. Você também pode pedir uma demonstração.
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Tempo médio de resposta: até 1 dia útil · Suporte a time técnico e comercial · Atendimento em PT/EN.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4">
                <Input placeholder="Nome" className="border-gray-300" />
                <Input type="email" placeholder="Email" className="border-gray-300" />
                <Input placeholder="Assunto (opcional)" className="border-gray-300" />
              </div>
              <div className="space-y-4">
                <Textarea placeholder="Mensagem" className="border-gray-300 min-h-[120px]" />
                <div className="flex items-start space-x-2 text-sm">
                  <Checkbox id="contact-privacy" className="mt-0.5" />
                  <label htmlFor="contact-privacy" className="text-gray-600 cursor-pointer text-left">
                    Concordo com o tratamento dos meus dados conforme a Política de Privacidade
                  </label>
                </div>
                <Button className="w-full bg-altea-navy text-white hover:bg-altea-navy/90 cursor-pointer">
                  Enviar mensagem
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-altea-navy text-white py-8 sm:py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-altea-gold p-2 rounded-lg">
                  <div className="h-5 w-5 bg-altea-navy rounded-sm flex items-center justify-center">
                    <span className="text-altea-gold font-bold text-xs">A</span>
                  </div>
                </div>
                <span className="text-lg font-semibold">Altea Pay</span>
              </div>
              <p className="text-blue-100 text-sm">
                Soluções de crédito para recuperação de inadimplência e premiação de adimplência.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <div className="space-y-2 text-sm">
                <a
                  href="#solucoes"
                  className="block text-blue-100 hover:text-altea-gold transition-colors cursor-pointer"
                >
                  Soluções
                </a>
                <a
                  href="#contato"
                  className="block text-blue-100 hover:text-altea-gold transition-colors cursor-pointer"
                >
                  Contato
                </a>
                <a
                  href="#newsletter"
                  className="block text-blue-100 hover:text-altea-gold transition-colors cursor-pointer"
                >
                  Novidades
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Privacidade</h4>
              <p className="text-blue-100 text-sm mb-4">
                Ao enviar seus dados, você concorda com o tratamento para contato e envio de comunicações sobre produtos
                e serviços da Altea Pay. Você pode solicitar a exclusão a qualquer momento.
              </p>
            </div>
          </div>

          <div className="border-t border-white/20 mt-6 sm:mt-8 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-blue-100">
            <p>© 2025 Altea Pay. Todos os direitos reservados. Uma empresa do grupo Altea · CNPJ 60.410.775/0001-67.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
