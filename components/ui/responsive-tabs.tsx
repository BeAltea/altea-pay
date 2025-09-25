"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface ResponsiveTabsContextType {
  value: string
  onValueChange: (value: string) => void
}

const ResponsiveTabsContext = React.createContext<ResponsiveTabsContextType | undefined>(undefined)

function useResponsiveTabs() {
  const context = React.useContext(ResponsiveTabsContext)
  if (!context) {
    throw new Error("ResponsiveTabs components must be used within ResponsiveTabs")
  }
  return context
}

interface ResponsiveTabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

function ResponsiveTabs({ defaultValue, value, onValueChange, children, className }: ResponsiveTabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const currentValue = value ?? internalValue

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue)
    } else {
      setInternalValue(newValue)
    }
  }

  return (
    <ResponsiveTabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("space-y-4", className)}>{children}</div>
    </ResponsiveTabsContext.Provider>
  )
}

interface ResponsiveTabsListProps {
  children: React.ReactNode
  className?: string
}

function ResponsiveTabsList({ children, className }: ResponsiveTabsListProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const { value } = useResponsiveTabs()

  // Get the active tab label
  const getActiveTabLabel = () => {
    const activeChild = React.Children.toArray(children).find((child) => {
      if (React.isValidElement(child) && child.props.value === value) {
        return true
      }
      return false
    })

    if (React.isValidElement(activeChild)) {
      return activeChild.props.children
    }
    return "Selecionar"
  }

  return (
    <>
      {/* Mobile Dropdown */}
      <div className="md:hidden">
        <Button variant="outline" className="w-full justify-between bg-transparent" onClick={() => setIsOpen(!isOpen)}>
          {getActiveTabLabel()}
          <ChevronDown className="h-4 w-4" />
        </Button>
        {isOpen && (
          <div className="mt-2 border rounded-md bg-background shadow-lg">
            <div className="p-1">{children}</div>
          </div>
        )}
      </div>

      {/* Desktop Tabs */}
      <div className={cn("hidden md:block overflow-x-auto", className)}>
        <div className="flex space-x-1 border-b">{children}</div>
      </div>
    </>
  )
}

interface ResponsiveTabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
}

function ResponsiveTabsTrigger({ value, children, className }: ResponsiveTabsTriggerProps) {
  const { value: currentValue, onValueChange } = useResponsiveTabs()
  const isActive = currentValue === value

  return (
    <>
      {/* Mobile version */}
      <button
        className={cn(
          "md:hidden w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-sm",
          isActive && "bg-accent",
          className,
        )}
        onClick={() => onValueChange(value)}
      >
        {children}
      </button>

      {/* Desktop version */}
      <button
        className={cn(
          "hidden md:inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          isActive
            ? "bg-background text-foreground shadow-sm border-b-2 border-primary"
            : "text-muted-foreground hover:text-foreground",
          className,
        )}
        onClick={() => onValueChange(value)}
      >
        {children}
      </button>
    </>
  )
}

interface ResponsiveTabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
}

function ResponsiveTabsContent({ value, children, className }: ResponsiveTabsContentProps) {
  const { value: currentValue } = useResponsiveTabs()

  if (currentValue !== value) {
    return null
  }

  return <div className={cn("mt-4", className)}>{children}</div>
}

// Compound component pattern
ResponsiveTabs.List = ResponsiveTabsList
ResponsiveTabs.Trigger = ResponsiveTabsTrigger
ResponsiveTabs.Content = ResponsiveTabsContent

// Named exports for direct import
export { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent }
