import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/hooks/use-auth"
import { Suspense } from "react"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Altea Pay - Soluções de Cobrança Inteligente",
  description:
    "Com IA e dados comportamentais, orquestramos Pix, cartão, débito, recorrência, crédito via fatura e cashback de forma personalizada para elevar a taxa de recuperação com compliance total.",
  generator: "v0.app",
  keywords: ["cobrança", "pagamentos", "pix", "cartão", "recorrência", "inadimplência", "IA", "altea pay"],
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
      <body className={`font-sans ${inter.variable} ${jetbrainsMono.variable}`}>
        <Suspense fallback={null}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <AuthProvider>{children}</AuthProvider>
            <Toaster />
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  )
}
