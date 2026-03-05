// User roles in the system
export type UserRole = "super_admin" | "admin" | "user" | "viewer"

// Viewer role is read-only and can only see assigned company data
export function isViewerRole(role: string | null | undefined): boolean {
  return role === "viewer"
}

export function canPerformActions(role: string | null | undefined): boolean {
  return !isViewerRole(role)
}
