"use client"

import { createContext, useContext } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  Shield,
  Target,
  CreditCard,
  Sparkles,
  LayoutGrid,
  Mail,
  Handshake,
} from "lucide-react"

interface SuperAdminSidebarProps {
  user?: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
    }
  }
}

const MobileSuperAdminSidebarContext = createContext<{
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
}>({
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
})

export function useMobileSuperAdminSidebar() {
  return useContext(MobileSuperAdminSidebarContext)
}

export { MobileSuperAdminSidebarContext }

export function SuperAdminSidebar({ user }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileSuperAdminSidebar()

  const navigation = [
    {
      name: "Dashboard",
      href: "/super-admin",
      icon: LayoutDashboard,
      current: pathname === "/super-admin",
    },
    {
      name: "Empresas",
      href: "/super-admin/companies",
      icon: Building2,
      current: pathname.startsWith("/super-admin/companies"),
    },
    {
      name: "Clientes",
      href: "/super-admin/clientes",
      icon: Users,
      current: pathname.startsWith("/super-admin/clientes"),
    },
    {
      name: "Análise Restritiva",
      href: "/super-admin/analises",
      icon: CreditCard,
      current: pathname === "/super-admin/analises",
    },
    {
      name: "Análise Comportamental",
      href: "/super-admin/analises/comportamental",
      icon: Sparkles,
      current: pathname.startsWith("/super-admin/analises/comportamental"),
    },
    {
      name: "Análise Consolidada",
      href: "/super-admin/analises/consolidada",
      icon: LayoutGrid,
      current: pathname.startsWith("/super-admin/analises/consolidada"),
    },
    {
      name: "Usuários",
      href: "/super-admin/users",
      icon: Users,
      current: pathname.startsWith("/super-admin/users"),
    },
    {
      name: "Réguas de Cobrança",
      href: "/super-admin/collection-rules",
      icon: Target,
      current: pathname.startsWith("/super-admin/collection-rules"),
    },
    {
      name: "Negociações",
      href: "/super-admin/negotiations",
      icon: Handshake,
      current: pathname.startsWith("/super-admin/negotiations"),
    },
    {
      name: "Enviar Email",
      href: "/super-admin/send-email",
      icon: Mail,
      current: pathname.startsWith("/super-admin/send-email"),
    },
    {
      name: "Relatórios Globais",
      href: "/super-admin/reports",
      icon: BarChart3,
      current: pathname.startsWith("/super-admin/reports"),
    },

    {
      name: "Configurações",
      href: "/super-admin/settings",
      icon: Settings,
      current: pathname.startsWith("/super-admin/settings"),
    },
  ]

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center px-4 sm:px-6 border-b border-gray-200 dark:border-[oklch(0.26_0.02_240)]">
        <div className="flex items-center space-x-3">
          <div className="bg-altea-gold p-2 rounded-lg flex-shrink-0">
            <div className="h-5 w-5 bg-altea-navy rounded-sm flex items-center justify-center">
              <span className="text-altea-gold font-bold text-xs">A</span>
            </div>
          </div>
          <div className="min-w-0">
            <span className="text-lg font-semibold text-gray-900 dark:text-white truncate">Altea Pay</span>
            <div className="flex items-center space-x-1">
              <Shield className="h-3 w-3 text-altea-gold" />
              <span className="text-xs text-altea-gold font-medium">Super Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
            <Button
              variant={item.current ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start text-left h-10 px-3 transition-all duration-200",
                item.current
                  ? "bg-altea-gold/10 text-altea-navy dark:bg-[oklch(0.82_0.18_85)] dark:text-[oklch(0.12_0.02_240)] font-semibold"
                  : "text-gray-700 dark:text-[oklch(0.92_0_0)] hover:bg-gray-100 dark:hover:bg-[oklch(0.2_0.02_240)] hover:text-gray-900 dark:hover:text-[oklch(0.98_0_0)]",
              )}
            >
              <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Button>
          </Link>
        ))}
      </nav>

      {/* User Info */}
      {user && (
        <div className="border-t border-gray-200 dark:border-[oklch(0.26_0.02_240)] p-4">
          <div className="flex items-center space-x-3 w-full min-w-0">
            <div className="bg-altea-gold/10 dark:bg-altea-gold/20 p-2 rounded-full flex-shrink-0">
              <Shield className="h-4 w-4 text-altea-navy dark:text-altea-gold" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.user_metadata?.full_name || "Super Admin"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Altea Pay</p>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return (
    <>
      <div className="hidden lg:flex h-full flex-col bg-white dark:bg-[oklch(0.12_0.02_240)] border-r border-gray-200 dark:border-[oklch(0.26_0.02_240)]">
        <SidebarContent />
      </div>

      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-80 max-w-[85vw] bg-white dark:bg-[oklch(0.12_0.02_240)]">
          <div className="flex h-full flex-col">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
