"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Bell, Search, Sun, Moon, User, Settings, LogOut, ChevronDown, Menu, X } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useMobileSidebar } from "./sidebar"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, CreditCard, Upload, Target, BarChart3 } from "lucide-react"

interface HeaderProps {
  user?: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
      company_name?: string
    }
    profile?: {
      role: string
      company_id: string | null
      full_name: string | null
      company: {
        id: string
        name: string
        subscription_plan: string
      } | null
    }
  }
}

export function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileSidebar()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest("[data-dropdown]")) {
        setShowNotifications(false)
        setShowUserMenu(false)
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    console.log("[v0] Header - Sign out initiated")
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error("[v0] Header - Sign out error:", error)
        toast({
          title: "Erro",
          description: "Erro ao fazer logout. Tente novamente.",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Header - Sign out successful, redirecting...")
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      })

      // Force redirect to login page
      window.location.href = "/auth/login"
    } catch (error) {
      console.error("[v0] Header - Sign out exception:", error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer logout.",
        variant: "destructive",
      })
    }
  }

  const handleThemeToggle = () => {
    console.log("[v0] Header - Theme toggle clicked, current theme:", theme)
    setTheme(theme === "dark" ? "light" : "dark")
    toast({
      title: "Tema alterado",
      description: `Tema alterado para ${theme === "dark" ? "claro" : "escuro"}`,
    })
  }

  const handleNotificationClick = (notification: string) => {
    console.log("[v0] Header - Notification clicked:", notification)
    toast({
      title: "Notificação",
      description: notification,
    })
    setShowNotifications(false)
  }

  const userInitials =
    user?.profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user?.user_metadata?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user?.email?.[0].toUpperCase() ||
    "U"

  const displayName = user?.profile?.full_name || user?.user_metadata?.full_name || "Usuário"
  const companyName = user?.profile?.company?.name || user?.user_metadata?.company_name || user?.email

  if (!mounted) {
    return (
      <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-altea-navy">
        <div className="flex h-full items-center justify-between px-4 sm:px-6">
          <div className="flex items-center space-x-4">
            <div className="lg:hidden h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex items-center space-x-4 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar clientes, dívidas..."
                  className="pl-10 bg-gray-50 dark:bg-gray-800 border-0"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-altea-navy flex-shrink-0">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-10 w-10 p-0 bg-white dark:bg-altea-navy border border-gray-200 dark:border-gray-700 shadow-sm"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>

          <div className="flex items-center space-x-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar clientes, dívidas..."
                className="pl-10 bg-gray-50 dark:bg-gray-800 border-0 text-sm sm:text-base h-9"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 sm:space-x-3">
          {/* Theme Toggle */}
          <Button variant="ghost" size="sm" onClick={handleThemeToggle} className="h-9 w-9 p-0">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Alternar tema</span>
          </Button>

          {/* Notifications */}
          <div className="relative" data-dropdown>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 relative"
              onClick={(e) => {
                e.stopPropagation()
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
            >
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-altea-gold text-altea-navy hover:bg-altea-gold">
                3
              </Badge>
              <span className="sr-only">Notificações</span>
            </Button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-sm">Notificações</h3>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => handleNotificationClick("Nova importação concluída")}
                    className="w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm border-b border-gray-100 dark:border-gray-700"
                  >
                    <p className="font-medium">Nova importação concluída</p>
                    <p className="text-xs text-gray-500 mt-1">152 registros processados com sucesso</p>
                  </button>
                  <button
                    onClick={() => handleNotificationClick("Régua de cobrança executada")}
                    className="w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm border-b border-gray-100 dark:border-gray-700"
                  >
                    <p className="font-medium">Régua de cobrança executada</p>
                    <p className="text-xs text-gray-500 mt-1">45 emails enviados automaticamente</p>
                  </button>
                  <button
                    onClick={() => handleNotificationClick("Pagamento recebido")}
                    className="w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  >
                    <p className="font-medium">Pagamento recebido</p>
                    <p className="text-xs text-gray-500 mt-1">R$ 1.250,00 - Cliente João Silva</p>
                  </button>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                  <button
                    onClick={() => handleNotificationClick("Ver todas as notificações")}
                    className="w-full px-2 py-2 text-sm text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
                  >
                    Ver todas as notificações
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          {user && (
            <div className="relative" data-dropdown>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 p-1 sm:p-2 h-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowUserMenu(!showUserMenu)
                  setShowNotifications(false)
                }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="bg-altea-navy text-altea-gold text-sm">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-32">{displayName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">{companyName}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
              </Button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-sm">Minha conta</h3>
                    <div className="md:hidden mt-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{displayName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{companyName}</p>
                    </div>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Ver perfil
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configurações
                    </Link>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-red-600 dark:text-red-400"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair da conta
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white dark:bg-altea-navy border-r border-gray-200 dark:border-gray-700 flex flex-col lg:hidden shadow-xl">
            {/* Mobile Sidebar Content */}
            <div className="flex h-16 items-center px-4 sm:px-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <div className="bg-altea-gold p-2 rounded-lg flex-shrink-0">
                    <div className="h-5 w-5 bg-altea-navy rounded-sm flex items-center justify-center">
                      <span className="text-altea-gold font-bold text-xs">A</span>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white truncate">Altea Pay</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar menu</span>
                </Button>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-3 py-4 overflow-y-auto">
              <nav className="space-y-1">
                {[
                  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
                  { name: "Clientes", href: "/dashboard/customers", icon: Users },
                  { name: "Dívidas", href: "/dashboard/debts", icon: CreditCard },
                  { name: "Importar Dados", href: "/dashboard/import", icon: Upload },
                  { name: "Réguas de Cobrança", href: "/dashboard/collection-rules", icon: Target },
                  { name: "Relatórios", href: "/dashboard/reports", icon: BarChart3 },
                  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
                ].map((item) => {
                  const pathname = window.location.pathname
                  const isActive = pathname === item.href
                  return (
                    <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className="block">
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start text-left h-10 px-3",
                          isActive && "bg-altea-gold/10 text-altea-navy dark:bg-altea-gold/20 dark:text-altea-gold",
                        )}
                      >
                        <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Button>
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* User Menu */}
            {user && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-3 w-full min-w-0">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-altea-navy text-altea-gold text-sm">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{companyName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </header>
  )
}
