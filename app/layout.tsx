import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/hooks/use-auth"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Altea Pay - Soluções de Cobrança Inteligente",
  description:
    "Com IA e dados comportamentais, orquestramos Pix, cartão, débito, recorrência, crédito via fatura e cashback de forma personalizada para elevar a taxa de recuperação com compliance total.",
  generator: "v0.app",
  keywords: ["cobrança", "pagamentos", "pix", "cartão", "recuperação", "inadimplência", "IA", "altea pay"],
  authors: [{ name: "Altea Pay" }],
  creator: "Altea Pay",
  publisher: "Altea Pay",
  openGraph: {
    title: "Altea Pay - Soluções de Cobrança Inteligente",
    description:
      "Análise que prevê, experiências que pagam, do seu jeito. Soluções de crédito para recuperação de inadimplência e premiação de adimplência.",
    type: "website",
    locale: "pt_BR",
    siteName: "Altea Pay",
  },
  twitter: {
    card: "summary_large_image",
    title: "Altea Pay - Soluções de Cobrança Inteligente",
    description: "Análise que prevê, experiências que pagam, do seu jeito.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <AuthProvider>{children}</AuthProvider>
            <Toaster />
          </ThemeProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
