"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Menu, Search, Bell, Sun, Moon, User, Settings, LogOut, ChevronDown } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Notification {
  id: string
  title: string
  description: string
  type: string
  read: boolean
  created_at: string
}

interface AdminHeaderProps {
  user: {
    id: string
    email?: string
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
  onMenuClick?: () => void
}

export function AdminHeader({ user, onMenuClick }: AdminHeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const displayName = user?.profile?.full_name || user?.email?.split("@")[0] || "Admin"
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!user?.profile?.company_id) return

    const fetchNotifications = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("company_id", user.profile!.company_id)
          .order("created_at", { ascending: false })
          .limit(10)

        if (!error && data) {
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
  }, [user?.profile?.company_id])

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
      await supabase.auth.signOut({ scope: "local" })

      toast({
        title: "Logout realizado",
        description: "Voce foi desconectado com sucesso.",
      })

      if (typeof window !== "undefined") {
        localStorage.clear()
        sessionStorage.clear()
      }

      window.location.href = "/auth/login"
    } catch (error) {
      console.error("Sign out error:", error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer logout.",
        variant: "destructive",
      })
      window.location.href = "/auth/login"
    }
  }

  const handleNotificationClick = async (notificationId: string) => {
    try {
      const supabase = createClient()
      await supabase.from("notifications").update({ read: true }).eq("id", notificationId)

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
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
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}min`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    return date.toLocaleDateString("pt-BR")
  }

  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (!mounted) return null

  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-xl"
      style={{
        padding: "14px 32px",
        background: "rgba(15, 17, 23, 0.8)",
        borderBottom: "1px solid var(--admin-bg-tertiary)"
      }}
    >
      <div className="flex items-center justify-between">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2 rounded-lg transition-colors"
          style={{
            background: "var(--admin-bg-tertiary)",
            border: "1px solid var(--admin-border)",
            color: "var(--admin-text-secondary)"
          }}
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search Bar */}
        <div
          className="hidden sm:flex items-center gap-2 rounded-[10px] px-[14px] py-2 w-[320px]"
          style={{
            background: "var(--admin-bg-tertiary)",
            border: "1px solid var(--admin-border)"
          }}
        >
          <Search className="w-4 h-4" style={{ color: "var(--admin-text-muted)" }} />
          <input
            type="text"
            placeholder="Buscar clientes, dividas..."
            className="bg-transparent border-none outline-none text-[13px] w-full"
            style={{
              color: "var(--admin-text-primary)",
              fontFamily: "'DM Sans', sans-serif"
            }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-[10px]">
          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{
              background: "var(--admin-bg-tertiary)",
              border: "1px solid var(--admin-border)",
              color: "var(--admin-text-secondary)"
            }}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          <div className="relative" data-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowNotifications(!showNotifications)
                setShowUserMenu(false)
              }}
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-all relative"
              style={{
                background: "var(--admin-bg-tertiary)",
                border: "1px solid var(--admin-border)",
                color: "var(--admin-text-secondary)"
              }}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{
                    background: "var(--admin-red)",
                    color: "white"
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                className="absolute right-0 top-full mt-2 w-80 rounded-lg shadow-lg max-h-96 overflow-y-auto"
                style={{
                  background: "var(--admin-bg-secondary)",
                  border: "1px solid var(--admin-border)"
                }}
              >
                <div
                  className="p-3 font-semibold text-sm"
                  style={{
                    borderBottom: "1px solid var(--admin-border)",
                    color: "var(--admin-text-primary)"
                  }}
                >
                  Notificacoes
                </div>
                <div className="py-1">
                  {notifications.length === 0 ? (
                    <div
                      className="px-4 py-8 text-center text-sm"
                      style={{ color: "var(--admin-text-muted)" }}
                    >
                      Nenhuma notificacao
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id)}
                        className={cn(
                          "w-full px-3 py-3 text-left text-sm transition-colors",
                          !notification.read && "bg-[var(--admin-blue-bg)]"
                        )}
                        style={{
                          borderBottom: "1px solid var(--admin-border)",
                          color: "var(--admin-text-secondary)"
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-medium truncate"
                              style={{
                                color: !notification.read
                                  ? "var(--admin-blue)"
                                  : "var(--admin-text-primary)"
                              }}
                            >
                              {notification.title}
                            </p>
                            <p
                              className="text-xs mt-1 line-clamp-2"
                              style={{ color: "var(--admin-text-muted)" }}
                            >
                              {notification.description}
                            </p>
                            <p
                              className="text-xs mt-1"
                              style={{ color: "var(--admin-text-muted)" }}
                            >
                              {formatRelativeTime(notification.created_at)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                              style={{ background: "var(--admin-blue)" }}
                            />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="relative" data-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowUserMenu(!showUserMenu)
                setShowNotifications(false)
              }}
              className="flex items-center gap-2 p-1 rounded-lg transition-colors"
              style={{
                background: showUserMenu ? "var(--admin-bg-tertiary)" : "transparent"
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px]"
                style={{
                  background: "linear-gradient(135deg, var(--admin-gold-400), var(--admin-gold-600))",
                  color: "var(--admin-bg-primary)"
                }}
              >
                {userInitials}
              </div>
              <div className="hidden md:block text-left">
                <p
                  className="text-sm font-medium truncate max-w-32"
                  style={{ color: "var(--admin-text-primary)" }}
                >
                  {displayName}
                </p>
                <p
                  className="text-xs truncate max-w-32"
                  style={{ color: "var(--admin-text-muted)" }}
                >
                  {user?.profile?.company?.name || "Administrador"}
                </p>
              </div>
              <ChevronDown
                className="w-4 h-4 hidden sm:block"
                style={{ color: "var(--admin-text-muted)" }}
              />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg z-50"
                style={{
                  background: "var(--admin-bg-secondary)",
                  border: "1px solid var(--admin-border)"
                }}
              >
                <div
                  className="p-3"
                  style={{ borderBottom: "1px solid var(--admin-border)" }}
                >
                  <p
                    className="font-medium text-sm"
                    style={{ color: "var(--admin-text-primary)" }}
                  >
                    {displayName}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--admin-text-muted)" }}
                  >
                    {user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard/configuracoes"
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: "var(--admin-text-secondary)" }}
                    onClick={() => setShowUserMenu(false)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--admin-bg-tertiary)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent"
                    }}
                  >
                    <Settings className="w-4 h-4" />
                    Configuracoes
                  </Link>
                </div>
                <div style={{ borderTop: "1px solid var(--admin-border)" }} className="py-1">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                    style={{ color: "var(--admin-red)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--admin-red-bg)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent"
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
