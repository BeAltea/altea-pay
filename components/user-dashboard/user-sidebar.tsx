"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { X } from "lucide-react"
import { Home, CreditCard, History, MessageSquare, BarChart3, User, LogOut, ChevronDown } from "lucide-react"
import { signOut } from "next-auth/react"

const navigation = [
  { name: "Início", href: "/user-dashboard", icon: Home },
  { name: "Minhas Dívidas", href: "/user-dashboard/debts", icon: CreditCard },
  { name: "Histórico", href: "/user-dashboard/history", icon: History },
  { name: "Negociação", href: "/user-dashboard/negotiation", icon: MessageSquare },
  { name: "Análise de Propensão", href: "/user-dashboard/propensity", icon: BarChart3 },
  { name: "Perfil", href: "/user-dashboard/profile", icon: User },
]

interface UserSidebarProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
      company_name?: string
    }
  }
  isMobileMenuOpen?: boolean
  setIsMobileMenuOpen?: (open: boolean) => void
}

const NavigationItem = memo(
  ({
    item,
    isActive,
    onClose,
  }: {
    item: (typeof navigation)[0]
    isActive: boolean
    onClose: () => void
  }) => (
    <Link href={item.href} onClick={onClose} className="block">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start text-left h-10 px-3 transition-all duration-200 group",
          isActive && "bg-altea-gold/10 text-altea-navy dark:bg-altea-gold/20 dark:text-altea-gold shadow-sm",
          !isActive && "hover:bg-accent/50 hover:text-accent-foreground dark:hover:bg-accent/30",
        )}
      >
        <item.icon
          className={cn(
            "mr-3 h-4 w-4 flex-shrink-0 transition-colors duration-200",
            isActive ? "text-altea-navy dark:text-altea-gold" : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span className="truncate">{item.name}</span>
      </Button>
    </Link>
  ),
)

NavigationItem.displayName = "NavigationItem"

export const UserSidebar = memo(function UserSidebar({
  user,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}: UserSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false)

  const isOpen = isMobileMenuOpen ?? internalMobileMenuOpen
  const setIsOpen = setIsMobileMenuOpen ?? setInternalMobileMenuOpen

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname, setIsOpen])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, setIsOpen])

  const handleSignOut = useCallback(async () => {
    await signOut({ callbackUrl: "/auth/login" })
  }, [])

  const userInitials = useMemo(
    () =>
      user.user_metadata?.full_name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() ||
      user.email?.[0].toUpperCase() ||
      "U",
    [user.user_metadata?.full_name, user.email],
  )

  const SidebarContent = useMemo(
    () => (
      <>
        {/* Logo/Header */}
        <div className="flex h-16 items-center px-4 sm:px-6 border-b border-border">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div className="bg-altea-gold p-2 rounded-lg flex-shrink-0 shadow-sm">
                <div className="h-5 w-5 bg-altea-navy rounded-sm flex items-center justify-center">
                  <span className="text-altea-gold font-bold text-xs">A</span>
                </div>
              </div>
              <span className="text-lg font-semibold text-foreground truncate">Altea Pay</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-8 w-8 p-0 flex-shrink-0 hover:bg-accent/50"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar menu</span>
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => (
              <NavigationItem key={item.href} item={item} isActive={pathname === item.href} onClose={handleClose} />
            ))}
          </nav>
        </ScrollArea>

        {/* User Menu */}
        <div className="border-t border-border p-4">
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
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.user_metadata?.full_name || "Usuário"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.user_metadata?.company_name || user.email}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/user-dashboard/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Perfil
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
      </>
    ),
    [pathname, handleClose, userInitials, user, handleSignOut],
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full w-64 flex-col bg-card border-r border-border shadow-sm">
        {SidebarContent}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
            onClick={handleClose}
            aria-hidden="true"
          />

          <div className="fixed left-0 top-0 bottom-0 z-50 w-80 max-w-[85vw] bg-card border-r border-border flex flex-col lg:hidden shadow-2xl transform transition-transform duration-300 ease-out">
            {SidebarContent}
          </div>
        </>
      )}
    </>
  )
})

export function useMobileUserSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  return { isMobileMenuOpen, setIsMobileMenuOpen }
}
