import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Localize | AlteaPay",
  description: "Consulta de dados cadastrais via Assertiva Localize",
}

export default function LocalizeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {children}
    </div>
  )
}
