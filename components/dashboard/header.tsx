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
import { LayoutDashboard, Users, CreditCard, Upload, Target, BarChart3, FileCheck } from "lucide-react"

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
      } | null
    }
  }
}

interface Notification {
  id: string
  title: string
  description: string
  type: string
  read: boolean
  created_at: string
}

export function Header({ user }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const router = useRouter()
  const { toast } = useToast()
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useMobileSidebar()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const fetchNotifications = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5)

        if (error) throw error

        if (data) {
          setNotifications(data)
          setUnreadCount(data.filter((n) => !n.read).length)
        }
      } catch (error) {
        console.error("Error fetching notifications:", error)
      }
    }

    fetchNotifications()

    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user?.id])

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
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        toast({
          title: "Erro",
          description: "Erro ao fazer logout. Tente novamente.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      })

      window.location.href = "/auth/login"
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer logout.",
        variant: "destructive",
      })
    }
  }

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
    toast({
      title: "Tema alterado",
      description: `Tema alterado para ${theme === "dark" ? "claro" : "escuro"}`,
    })
  }

  const handleNotificationClick = async (notificationId: string) => {
    try {
      const supabase = createClient()
      await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Agora mesmo"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min atrás`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atrás`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d atrás`
    return date.toLocaleDateString("pt-BR")
  }

  const displayName =
    user?.profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário"
  const companyName = user?.profile?.company?.name || user?.user_metadata?.company_name || "Empresa"
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  if (!mounted) {
    return null
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0 flex-shrink-0"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>

          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Buscar..."
                className="pl-8 h-9 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={handleThemeToggle}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="sr-only">Alternar tema</span>
            </Button>

            <div className="relative" data-dropdown>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0 relative"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowNotifications(!showNotifications)
                  setShowUserMenu(false)
                }}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-red-500 hover:bg-red-600">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notificações</span>
              </Button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 lg:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 max-h-80 sm:max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-sm">Notificações</h3>
                  </div>
                  <div className="py-1">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-gray-500">Nenhuma notificação no momento</div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification.id)}
                          className={cn(
                            "w-full px-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm border-b border-gray-100 dark:border-gray-700 transition-colors",
                            !notification.read && "bg-blue-50 dark:bg-blue-900/20",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "font-medium truncate",
                                  !notification.read && "text-blue-600 dark:text-blue-400",
                                )}
                              >
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.description}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatRelativeTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                    <Link
                      href="/dashboard/notifications"
                      className="block w-full px-2 py-2 text-sm text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-center"
                      onClick={() => setShowNotifications(false)}
                    >
                      Ver todas as notificações
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {user && (
              <div className="relative" data-dropdown>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-1 sm:space-x-2 p-1 sm:p-2 h-8 sm:h-10 min-w-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowUserMenu(!showUserMenu)
                    setShowNotifications(false)
                  }}
                >
                  <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-altea-navy text-altea-gold text-xs sm:text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-24 lg:max-w-32">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-24 lg:max-w-32">
                      {companyName}
                    </p>
                  </div>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 hidden sm:block flex-shrink-0" />
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

        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            <div className="fixed left-0 top-0 bottom-0 z-50 w-72 sm:w-80 max-w-[85vw] bg-white dark:bg-altea-navy border-r border-gray-200 dark:border-gray-700 flex flex-col lg:hidden shadow-xl">
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

              <div className="flex-1 px-3 py-4 overflow-y-auto">
                <nav className="space-y-1">
                  {[
                    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
                    { name: "Clientes", href: "/dashboard/clientes", icon: Users },
                    { name: "Acordos", href: "/dashboard/agreements", icon: FileCheck },
                    { name: "Importar Dados", href: "/dashboard/import", icon: Upload },
                    { name: "Réguas de Cobrança", href: "/dashboard/collection-rules", icon: Target },
                    { name: "Relatórios", href: "/dashboard/reports", icon: BarChart3 },
                    { name: "Configurações", href: "/dashboard/settings", icon: Settings },
                  ].map((item) => {
                    const pathname = window.location.pathname
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block"
                      >
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
      </div>
    </header>
  )
}
