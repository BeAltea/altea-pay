"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface ResponsiveTableProps {
  data: any[]
  columns: {
    key: string
    label: string
    render?: (value: any, item: any) => ReactNode
    mobileLabel?: string
    hideOnMobile?: boolean
  }[]
  actions?: (item: any) => ReactNode
  emptyState?: ReactNode
}

export function ResponsiveTable({ data, columns, actions, emptyState }: ResponsiveTableProps) {
  if (data.length === 0 && emptyState) {
    return <div className="py-8">{emptyState}</div>
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              {columns.map((column) => (
                <th key={column.key} className="text-left p-4 font-medium text-sm text-muted-foreground">
                  {column.label}
                </th>
              ))}
              {actions && <th className="text-left p-4 font-medium text-sm text-muted-foreground">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border-b hover:bg-muted/50">
                {columns.map((column) => (
                  <td key={column.key} className="p-4">
                    {column.render ? column.render(item[column.key], item) : item[column.key]}
                  </td>
                ))}
                {actions && <td className="p-4">{actions(item)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {data.map((item, index) => (
          <Card key={index}>
            <CardContent className="p-4 space-y-3">
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div key={column.key} className="flex justify-between items-start">
                    <span className="text-sm font-medium text-muted-foreground min-w-0 flex-1">
                      {column.mobileLabel || column.label}:
                    </span>
                    <div className="text-sm font-medium text-right min-w-0 flex-1">
                      {column.render ? column.render(item[column.key], item) : item[column.key]}
                    </div>
                  </div>
                ))}
              {actions && <div className="pt-2 border-t">{actions(item)}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
