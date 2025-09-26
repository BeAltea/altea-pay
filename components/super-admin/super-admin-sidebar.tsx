"use client"

import { useState, createContext, useContext, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  Shield,
  FileText,
  TrendingUp,
  Database,
  LogOut,
  ChevronDown,
  User,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"

interface SuperAdminSidebarProps {
  user?: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
    }
  }
}

// Context for mobile sidebar state
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

export function SuperAdminSidebar({ user }: SuperAdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
      name: "Usuários",
      href: "/super-admin/users",
      icon: Users,
      current: pathname.startsWith("/super-admin/users"),
    },
    {
      name: "Relatórios Globais",
      href: "/super-admin/reports",
      icon: BarChart3,
      current: pathname.startsWith("/super-admin/reports"),
    },
    {
      name: "Analytics",
      href: "/super-admin/analytics",
      icon: TrendingUp,
      current: pathname.startsWith("/super-admin/analytics"),
    },
    {
      name: "Auditoria",
      href: "/super-admin/audit",
      icon: FileText,
      current: pathname.startsWith("/super-admin/audit"),
    },
    {
      name: "Sistema",
      href: "/super-admin/system",
      icon: Database,
      current: pathname.startsWith("/super-admin/system"),
    },
    {
      name: "Configurações",
      href: "/super-admin/settings",
      icon: Settings,
      current: pathname.startsWith("/super-admin/settings"),
    },
  ]

  const handleSignOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }, [router])

  const userInitials = useMemo(
    () =>
      user?.user_metadata?.full_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() ||
      user?.email?.[0].toUpperCase() ||
      "SA",
    [user?.user_metadata?.full_name, user?.email],
  )

  return (
    <MobileSuperAdminSidebarContext.Provider value={{ isMobileMenuOpen, setIsMobileMenuOpen }}>
      <div className="flex h-full flex-col bg-white dark:bg-altea-navy border-r border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="flex h-16 items-center px-4 sm:px-6 border-b border-gray-200 dark:border-gray-700">
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
            <Link key={item.name} href={item.href}>
              <Button
                variant={item.current ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-left h-10 px-3",
                  item.current && "bg-altea-gold/10 text-altea-navy dark:bg-altea-gold/20 dark:text-altea-gold",
                )}
              >
                <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Button>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-2 h-auto hover:bg-accent/50 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3 w-full min-w-0">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback className="bg-altea-navy text-altea-gold text-sm">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.user_metadata?.full_name || "Super Admin"}
                      </p>
                      <p className="text-xs text-altea-gold truncate">Altea Pay</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Super Administrador</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/super-admin/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/super-admin/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </MobileSuperAdminSidebarContext.Provider>
  )
}
