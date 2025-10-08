"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, Eye, Mail, Phone, MessageSquare, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { createCustomer, deleteCustomer } from "@/app/actions/customer-actions"

interface Customer {
  id: string
  name: string
  email: string
  document: string
  phone?: string
  totalDebts: number
  totalAmount: number
  status: "active" | "inactive" | "overdue"
  riskLevel: "low" | "medium" | "high" | "critical"
  lastContact?: string
  registrationDate: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [riskFilter, setRiskFilter] = useState<string>("all")
  const [activeTab, setActiveTab] = useState("all") // Added active tab state
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false)
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [contactType, setContactType] = useState<"email" | "phone" | "whatsapp">("email")
  const [contactMessage, setContactMessage] = useState("")
  const [openActionMenus, setOpenActionMenus] = useState<{ [key: string]: boolean }>({})
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    document: "",
    phone: "",
    status: "active" as Customer["status"], // Added status field
    riskLevel: "low" as Customer["riskLevel"], // Added risk level field
    lastContact: "", // Added last contact field
  })

  const supabase = createClient()
  const { toast } = useToast()
  const { profile, loading: authLoading } = useAuth()

  useEffect(() => {
    const fetchCustomers = async () => {
      if (authLoading) return

      if (!profile?.company_id) {
        console.log("[v0] Customers - No company_id found in profile:", profile)
        toast({
          title: "Aviso",
          description: "Empresa não identificada. Entre em contato com o suporte.",
          variant: "destructive",
        })
        setCustomers([])
        setFilteredCustomers([])
        return
      }

      console.log("[v0] Customers - Fetching real customers for company:", profile.company_id)

      const { data: realCustomers, error } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Customers - Error fetching customers:", error)
        toast({
          title: "Erro",
          description: "Erro ao carregar clientes",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Customers - Real customers fetched:", realCustomers?.length || 0)

      const { data: debts } = await supabase
        .from("debts")
        .select("customer_id, amount, status")
        .eq("company_id", profile.company_id)

      const customersWithDebts: Customer[] = (realCustomers || []).map((customer) => {
        const customerDebts = debts?.filter((d) => d.customer_id === customer.id) || []
        const totalAmount = customerDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
        const hasOverdue = customerDebts.some((d) => d.status === "pending" || d.status === "in_collection")

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          document: customer.document,
          phone: customer.phone,
          totalDebts: customerDebts.length,
          totalAmount,
          status: hasOverdue ? "overdue" : "active",
          riskLevel:
            totalAmount > 5000 ? "critical" : totalAmount > 2000 ? "high" : totalAmount > 500 ? "medium" : "low",
          lastContact: customer.updated_at?.split("T")[0],
          registrationDate: customer.created_at?.split("T")[0],
        }
      })

      setCustomers(customersWithDebts)
      setFilteredCustomers(customersWithDebts)
    }

    fetchCustomers()
  }, [authLoading, profile]) // Updated dependency array

  useEffect(() => {
    let filtered = customers

    if (activeTab !== "all") {
      if (activeTab === "active") {
        filtered = filtered.filter((customer) => customer.status === "active")
      } else if (activeTab === "overdue") {
        filtered = filtered.filter((customer) => customer.status === "overdue")
      } else if (activeTab === "critical") {
        filtered = filtered.filter((customer) => customer.riskLevel === "critical")
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.document.includes(searchTerm) ||
          customer.phone?.includes(searchTerm),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((customer) => customer.status === statusFilter)
    }

    if (riskFilter !== "all") {
      filtered = filtered.filter((customer) => customer.riskLevel === riskFilter)
    }

    setFilteredCustomers(filtered)
  }, [customers, searchTerm, statusFilter, riskFilter, activeTab])

  const getStatusBadge = (status: Customer["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">Ativo</Badge>
        )
      case "inactive":
        return (
          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 text-xs">Inativo</Badge>
        )
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">Em Atraso</Badge>
    }
  }

  const getRiskBadge = (risk: Customer["riskLevel"]) => {
    switch (risk) {
      case "low":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs">Baixo</Badge>
        )
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 text-xs">
            Médio
          </Badge>
        )
      case "high":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
            Alto
          </Badge>
        )
      case "critical":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 text-xs">Crítico</Badge>
    }
  }

  const stats = {
    total: customers.length,
    active: customers.filter((c) => c.status === "active").length,
    overdue: customers.filter((c) => c.status === "overdue").length,
    critical: customers.filter((c) => c.riskLevel === "critical").length,
    totalAmount: customers.reduce((sum, customer) => sum + customer.totalAmount, 0),
  }

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.email || !newCustomer.document) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      })
      return
    }

    if (!profile?.company_id) {
      toast({
        title: "Erro",
        description: "Empresa não identificada",
        variant: "destructive",
      })
      return
    }

    const result = await createCustomer({
      name: newCustomer.name,
      email: newCustomer.email,
      document: newCustomer.document,
      phone: newCustomer.phone || undefined,
      companyId: profile.company_id,
    })

    if (result.success) {
      console.log("[v0] Customer created successfully:", result.data)

      // Refresh the customer list
      const { data: realCustomers } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })

      if (realCustomers) {
        const { data: debts } = await supabase
          .from("debts")
          .select("customer_id, amount, status")
          .eq("company_id", profile.company_id)

        const customersWithDebts: Customer[] = realCustomers.map((customer) => {
          const customerDebts = debts?.filter((d) => d.customer_id === customer.id) || []
          const totalAmount = customerDebts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
          const hasOverdue = customerDebts.some((d) => d.status === "pending" || d.status === "in_collection")

          return {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            document: customer.document,
            phone: customer.phone,
            totalDebts: customerDebts.length,
            totalAmount,
            status: hasOverdue ? "overdue" : "active",
            riskLevel:
              totalAmount > 5000 ? "critical" : totalAmount > 2000 ? "high" : totalAmount > 500 ? "medium" : "low",
            lastContact: customer.updated_at?.split("T")[0],
            registrationDate: customer.created_at?.split("T")[0],
          }
        })

        setCustomers(customersWithDebts)
      }

      setNewCustomer({
        name: "",
        email: "",
        document: "",
        phone: "",
        status: "active",
        riskLevel: "low",
        lastContact: "",
      })
      setIsNewCustomerOpen(false)

      toast({
        title: "Sucesso",
        description: result.message,
      })
    } else {
      toast({
        title: "Erro",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const handleContact = async (customer: Customer, type: "email" | "phone" | "whatsapp") => {
    setSelectedCustomer(customer)
    setContactType(type)
    setIsContactDialogOpen(true)
    setOpenActionMenus({})
  }

  const handleSendContact = async () => {
    if (!selectedCustomer || !contactMessage.trim()) {
      toast({
        title: "Erro",
        description: "Preencha a mensagem",
        variant: "destructive",
      })
      return
    }

    const contactTypeText = {
      email: "E-mail",
      phone: "Ligação",
      whatsapp: "WhatsApp",
    }[contactType]

    toast({
      title: "Contato enviado",
      description: `${contactTypeText} enviado para ${selectedCustomer.name}`,
    })

    setCustomers(
      customers.map((c) =>
        c.id === selectedCustomer.id ? { ...c, lastContact: new Date().toISOString().split("T")[0] } : c,
      ),
    )

    setContactMessage("")
    setIsContactDialogOpen(false)
    setSelectedCustomer(null)
  }

  const handleViewProfile = (customer: Customer) => {
    console.log("[v0] View profile clicked for:", customer.name)
    toast({
      title: "Perfil do Cliente",
      description: `Visualizando perfil de ${customer.name}`,
    })
    // Here you would navigate to customer profile page
    setOpenActionMenus({})
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!profile?.company_id) {
      toast({
        title: "Erro",
        description: "Empresa não identificada",
        variant: "destructive",
      })
      return
    }

    const result = await deleteCustomer({
      id: customerId,
      companyId: profile.company_id,
    })

    if (result.success) {
      setCustomers(customers.filter((c) => c.id !== customerId))
      toast({
        title: "Sucesso",
        description: result.message,
      })
    } else {
      toast({
        title: "Erro",
        description: result.message,
        variant: "destructive",
      })
    }

    setOpenActionMenus({})
  }

  const ActionButtons = ({ customer }: { customer: Customer }) => {
    const isOpen = openActionMenus[customer.id] || false

    return (
      <div className="relative">
        <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer" onClick={() => toggleActionMenu(customer.id)}>
          <MoreHorizontal className="h-4 w-4 cursor-pointer" />
        </Button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
            <div className="p-1 border-b border-gray-200 dark:border-gray-700">
              <span className="px-2 py-1 text-xs font-medium text-gray-500">Ações</span>
            </div>
            <div className="py-1">
              <button
                onClick={() => handleViewProfile(customer)}
                className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4 cursor-pointer" />
                Ver perfil
              </button>
              <button
                onClick={() => handleContact(customer, "email")}
                className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
              >
                <Mail className="mr-2 h-4 w-4 cursor-pointer" />
                Enviar email
              </button>
              <button
                onClick={() => handleContact(customer, "phone")}
                className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
              >
                <Phone className="mr-2 h-4 w-4 cursor-pointer" />
                Registrar ligação
              </button>
              <button
                onClick={() => handleContact(customer, "whatsapp")}
                className="flex items-center w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
              >
                <MessageSquare className="mr-2 h-4 w-4 cursor-pointer" />
                Enviar WhatsApp
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
              <button
                onClick={() => handleDeleteCustomer(customer.id)}
                className="flex items-center w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-sm cursor-pointer text-red-600 dark:text-red-400"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Excluir cliente
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const toggleActionMenu = (customerId: string) => {
    console.log("[v0] Action menu toggled for customer:", customerId)
    setOpenActionMenus((prev) => ({
      ...prev,
      [customerId]: !prev[customerId],
    }))
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col space-y-3 sm:space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Gestão de Clientes
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-600 dark:text-gray-400 mt-1">
            Visualize e gerencie todos os seus clientes e seus perfis de risco
          </p>
        </div>
        <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto text-xs sm:text-sm">
              <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Novo Cliente</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">Adicione um novo cliente ao sistema</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 sm:gap-4 py-4">
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="name" className="text-xs sm:text-sm font-medium">
                  Nome *
                </Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="text-xs sm:text-sm h-8 sm:h-9"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="email" className="text-xs sm:text-sm font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="text-xs sm:text-sm h-8 sm:h-9"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="document" className="text-xs sm:text-sm font-medium">
                  CPF/CNPJ *
                </Label>
                <Input
                  id="document"
                  value={newCustomer.document}
                  onChange={(e) => setNewCustomer({ ...newCustomer, document: e.target.value })}
                  className="text-xs sm:text-sm h-8 sm:h-9"
                />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="phone" className="text-xs sm:text-sm font-medium">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="text-xs sm:text-sm h-8 sm:h-9"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button onClick={handleCreateCustomer} className="flex-1 text-xs sm:text-sm h-8 sm:h-9">
                Criar Cliente
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsNewCustomerOpen(false)}
                className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total</div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Ativos</div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 col-span-2 sm:col-span-1">
          <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Em Atraso</div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.overdue}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Críticos</div>
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-800">{stats.critical}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Valor Total</div>
          <div className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 dark:text-white">
            R$ {stats.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 lg:p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <Input
            placeholder="Buscar por nome, email, documento ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs sm:text-sm h-8 sm:h-9"
          />

          <div className="flex flex-wrap gap-1 sm:gap-2">
            {[
              { key: "all", label: "Todos" },
              { key: "active", label: "Ativos" },
              { key: "overdue", label: "Em Atraso" },
              { key: "critical", label: "Críticos" },
            ].map((tab) => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className="text-xs h-7 sm:h-8 px-2 sm:px-3"
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="block sm:hidden">
          <div className="p-3 space-y-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">{customer.name}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{customer.email}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{customer.document}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(customer.status)}
                    <ActionButtons customer={customer} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    {getRiskBadge(customer.riskLevel)}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {customer.totalDebts} débito{customer.totalDebts !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-gray-900 dark:text-white">
                    R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contato
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Risco
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Débitos
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                        {customer.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{customer.document}</div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div>
                      <div className="text-xs sm:text-sm text-gray-900 dark:text-white">{customer.email}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{customer.phone || "N/A"}</div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                    {getStatusBadge(customer.status)}
                  </td>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                    {getRiskBadge(customer.riskLevel)}
                  </td>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-white">
                    {customer.totalDebts}
                  </td>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                    R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                    <ActionButtons customer={customer} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {contactType === "email" && "Enviar Email"}
              {contactType === "phone" && "Registrar Ligação"}
              {contactType === "whatsapp" && "Enviar WhatsApp"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedCustomer && `Para: ${selectedCustomer.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:gap-4 py-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="message" className="text-xs sm:text-sm font-medium">
                Mensagem
              </Label>
              <textarea
                id="message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs sm:text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Digite sua mensagem..."
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button onClick={handleSendContact} className="flex-1 text-xs sm:text-sm h-8 sm:h-9">
              Enviar
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsContactDialogOpen(false)}
              className="flex-1 text-xs sm:text-sm h-8 sm:h-9"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
