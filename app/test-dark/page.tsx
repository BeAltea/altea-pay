"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, DollarSign, TrendingUp, Clock } from "lucide-react"

export default function TestDarkPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Teste do Modo Dark</h1>
          <p className="text-muted-foreground">Verificando se todas as cores estão funcionando corretamente</p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dívidas em Aberto</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">R$ 45.230,50</p>
              <Badge variant="destructive" className="mt-1 text-xs">
                3 em atraso
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">R$ 28.450,00</div>
              <p className="text-xs text-muted-foreground">8 transações</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Propensão ao Pagamento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78.5%</div>
              <p className="text-xs text-muted-foreground">Média geral</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">R$ 5.200,00</div>
              <p className="text-xs text-muted-foreground">2 aguardando</p>
            </CardContent>
          </Card>
        </div>

        {/* Content Card */}
        <Card>
          <CardHeader>
            <CardTitle>Teste de Conteúdo</CardTitle>
            <p className="text-sm text-muted-foreground">Verificando contraste de texto e backgrounds</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-foreground">Texto principal (foreground)</p>
              <p className="text-muted-foreground">Texto secundário (muted-foreground)</p>
              <p className="text-primary">Texto primário (primary)</p>
              <p className="text-altea-navy dark:text-altea-gold">Texto Altea Navy/Gold</p>
            </div>

            <div className="flex gap-2">
              <Button>Botão Primário</Button>
              <Button variant="outline">Botão Outline</Button>
              <Button variant="secondary">Botão Secundário</Button>
              <Button variant="destructive">Botão Destrutivo</Button>
            </div>

            <div className="flex gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-foreground">Conteúdo em background muted</p>
              <p className="text-muted-foreground">Texto secundário em background muted</p>
            </div>

            <div className="p-4 bg-card border rounded-lg">
              <p className="text-card-foreground">Conteúdo em card background</p>
              <p className="text-muted-foreground">Texto secundário em card</p>
            </div>
          </CardContent>
        </Card>

        {/* Color Palette Test */}
        <Card>
          <CardHeader>
            <CardTitle>Paleta de Cores Altea Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-altea-navy rounded-lg">
                <p className="text-altea-gold font-medium">Altea Navy</p>
                <p className="text-altea-gold/80 text-sm">Background principal</p>
              </div>
              <div className="p-4 bg-altea-gold rounded-lg">
                <p className="text-altea-navy font-medium">Altea Gold</p>
                <p className="text-altea-navy/80 text-sm">Cor de destaque</p>
              </div>
              <div className="p-4 bg-primary rounded-lg">
                <p className="text-primary-foreground font-medium">Primary</p>
                <p className="text-primary-foreground/80 text-sm">Cor primária</p>
              </div>
              <div className="p-4 bg-secondary rounded-lg">
                <p className="text-secondary-foreground font-medium">Secondary</p>
                <p className="text-secondary-foreground/80 text-sm">Cor secundária</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
