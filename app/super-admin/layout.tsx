import type React from "react"
import { SuperAdminAuthWrapper } from "@/components/super-admin/super-admin-auth-wrapper"

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SuperAdminAuthWrapper>{children}</SuperAdminAuthWrapper>
}
