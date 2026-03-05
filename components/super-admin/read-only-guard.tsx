"use client"

import { useSuperAdminContext } from "@/components/super-admin/super-admin-auth-wrapper"

interface ReadOnlyGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Hides content for users with 'viewer' role.
 * Use this to wrap action buttons, forms, and destructive operations.
 *
 * @example
 * <ReadOnlyGuard>
 *   <Button onClick={handleDelete}>Excluir</Button>
 * </ReadOnlyGuard>
 *
 * @example with fallback
 * <ReadOnlyGuard fallback={<span className="text-gray-400">Somente leitura</span>}>
 *   <Button onClick={handleSave}>Salvar</Button>
 * </ReadOnlyGuard>
 */
export function ReadOnlyGuard({ children, fallback = null }: ReadOnlyGuardProps) {
  const { canPerformActions } = useSuperAdminContext()

  if (!canPerformActions) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Hook to check if current user can perform actions.
 * Returns false for viewer role users.
 */
export function useCanPerformActions(): boolean {
  const { canPerformActions } = useSuperAdminContext()
  return canPerformActions
}

/**
 * Hook to check if current user is a viewer.
 */
export function useIsViewer(): boolean {
  const { isViewer } = useSuperAdminContext()
  return isViewer
}

/**
 * Hook to get the viewer's company ID filter.
 * Returns null for super_admin (no filter), or company_id for viewers.
 */
export function useViewerCompanyFilter(): string | null {
  const { isViewer, companyId } = useSuperAdminContext()
  return isViewer ? companyId : null
}
