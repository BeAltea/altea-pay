"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, FileText, Settings, CreditCard, Building2 } from "lucide-react"

interface EmpresaSidebarProps {
  companyName?: string
}

export function EmpresaSidebar({ companyName }: EmpresaSidebarProps) {
  const pathname = usePathname()

  const navigation = [
    {
      name: "Dashboard",
      href: "/empresa/dashboard",
      icon: LayoutDashboard,
      current: pathname === "/empresa/dashboard",
    },
    {
      name: "Clientes",
      href: "/empresa/clientes",
      icon: Users,
      current: pathname.startsWith("/empresa/clientes"),
    },
    {
      name: "Análises de Crédito",
      href: "/empresa/analises",
      icon: CreditCard,
      current: pathname.startsWith("/empresa/analises"),
    },
    {
      name: "Relatórios",
      href: "/empresa/relatorios",
      icon: FileText,
      current: pathname.startsWith("/empresa/relatorios"),
    },
    {
      name: "Configurações",
      href: "/empresa/configuracoes",
      icon: Settings,
      current: pathname.startsWith("/empresa/configuracoes"),
    },
  ]

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <div className="flex h-16 items-center px-4 sm:px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {companyName || "Empresa"}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400">Portal da Empresa</p>
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
                item.current && "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
              )}
            >
              <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </Button>
          </Link>
        ))}
      </nav>
    </div>
  )
}
