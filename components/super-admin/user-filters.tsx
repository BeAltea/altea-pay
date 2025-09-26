"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function UserFilters() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const handleFilterChange = (filter: string) => {
    console.log("[v0] Filtro de usuários alterado para:", filter)
    setActiveFilter(filter)
    // Here you would typically filter the users list
    // For now, just showing the filter change
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    console.log("[v0] Pesquisando usuários por:", value)
    setSearchTerm(value)
    // Here you would typically filter the users by search term
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Buscar usuários..." className="pl-10" value={searchTerm} onChange={handleSearch} />
          </div>
          <div className="flex space-x-2">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("all")}
            >
              Todos
            </Button>
            <Button
              variant={activeFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("active")}
            >
              Ativos
            </Button>
            <Button
              variant={activeFilter === "admins" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("admins")}
            >
              Admins
            </Button>
            <Button
              variant={activeFilter === "suspended" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange("suspended")}
            >
              Suspensos
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  )
}
