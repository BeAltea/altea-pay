"use client"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleThemeChange = (newTheme: string) => {
    console.log("[v0] ThemeToggle - Changing theme to:", newTheme)
    setTheme(newTheme)

    const themeLabels = {
      light: "Claro",
      dark: "Escuro",
      system: "Sistema",
    }

    toast({
      title: "Tema alterado",
      description: `Tema alterado para ${themeLabels[newTheme as keyof typeof themeLabels]}`,
    })
  }

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Carregando tema...</span>
      </Button>
    )
  }

  const currentTheme = theme === "system" ? systemTheme : theme

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-accent hover:text-accent-foreground transition-colors duration-200 dark:hover:bg-accent/30"
          title={`Tema atual: ${theme === "light" ? "Claro" : theme === "dark" ? "Escuro" : "Sistema"}`}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => handleThemeChange("light")}
          className={`cursor-pointer transition-colors duration-150 ${
            theme === "light" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          }`}
        >
          <Sun className="mr-2 h-4 w-4" />
          <span>Claro</span>
          {theme === "light" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("dark")}
          className={`cursor-pointer transition-colors duration-150 ${
            theme === "dark" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          }`}
        >
          <Moon className="mr-2 h-4 w-4" />
          <span>Escuro</span>
          {theme === "dark" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleThemeChange("system")}
          className={`cursor-pointer transition-colors duration-150 ${
            theme === "system" ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          }`}
        >
          <Monitor className="mr-2 h-4 w-4" />
          <span>Sistema</span>
          {theme === "system" && <span className="ml-auto text-xs text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
