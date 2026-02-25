import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AlteaPay - Portal do Cliente",
  description: "Acesse seus debitos e realize pagamentos",
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
