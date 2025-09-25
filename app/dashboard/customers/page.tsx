"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  MoreHorizontal,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Eye,
  Mail,
  Phone,
  MessageSquare,
  Plus,
  Filter,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

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

  useEffect(() => {
    const mockCustomers: Customer[] = [
      {
        id: "1",
        name: "João Silva",
        email: "joao@email.com",
        document: "123.456.789-00",
        phone: "(11) 99999-9999",
        totalDebts: 2,
        totalAmount: 2625.5,
        status: "overdue",
        riskLevel: "critical",
        lastContact: "2024-01-15",
        registrationDate: "2023-06-15",
      },
      {
        id: "2",
        name: "Maria Santos",
        email: "maria@email.com",
        document: "987.654.321-00",
        phone: "(11) 88888-8888",
        totalDebts: 1,
        totalAmount: 945.8,
        status: "overdue",
        riskLevel: "high",
        lastContact: "2024-01-10",
        registrationDate: "2023-08-20",
      },
      {
        id: "3",
        name: "Pedro Costa",
        email: "pedro@email.com",
        document: "456.789.123-00",
        phone: "(11) 77777-7777",
        totalDebts: 1,
        totalAmount: 2205.0,
        status: "overdue",
        riskLevel: "medium",
        lastContact: "2024-01-12",
        registrationDate: "2023-09-10",
      },
      {
        id: "4",
        name: "Ana Oliveira",
        email: "ana@email.com",
        document: "789.123.456-00",
        phone: "(11) 66666-6666",
        totalDebts: 1,
        totalAmount: 467.25,
        status: "active",
        riskLevel: "low",
        lastContact: "2024-01-18",
        registrationDate: "2023-11-05",
      },
      {
        id: "5",
        name: "Carlos Ferreira",
        email: "carlos@email.com",
        document: "321.654.987-00",
        totalDebts: 0,
        totalAmount: 0,
        status: "active",
        riskLevel: "low",
        registrationDate: "2024-01-02",
      },
    ]
    setCustomers(mockCustomers)
    setFilteredCustomers(mockCustomers)
  }, [])

  useEffect(() => {
    let filtered = customers

    // Apply tab filter first
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
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Ativo</Badge>
      case "inactive":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">Inativo</Badge>
      case "overdue":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Em Atraso</Badge>
    }
  }

  const getRiskBadge = (risk: Customer["riskLevel"]) => {
    switch (risk) {
      case "low":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">Baixo</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">Médio</Badge>
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">Alto</Badge>
      case "critical":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">Crítico</Badge>
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

    const customer: Customer = {
      id: Date.now().toString(),
      name: newCustomer.name,
      email: newCustomer.email,
      document: newCustomer.document,
      phone: newCustomer.phone || undefined,
      totalDebts: 0,
      totalAmount: 0,
      status: newCustomer.status, // Use selected status
      riskLevel: newCustomer.riskLevel, // Use selected risk level
      lastContact: newCustomer.lastContact || undefined, // Use last contact if provided
      registrationDate: new Date().toISOString().split("T")[0],
    }

    setCustomers([...customers, customer])
    setNewCustomer({
      name: "",
      email: "",
      document: "",
      phone: "",
      status: "active",
      riskLevel: "low",
      lastContact: "",
    }) // Reset all fields including new ones
    setIsNewCustomerOpen(false)

    toast({
      title: "Sucesso",
      description: "Cliente criado com sucesso!",
    })
  }

  const handleContact = async (customer: Customer, type: "email" | "phone" | "whatsapp") => {
    setSelectedCustomer(customer)
    setContactType(type)
    setIsContactDialogOpen(true)
    setOpenActionMenus({}) // Close any open action menus
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
    setOpenActionMenus({}) // Close any open action menus
  }

  const toggleActionMenu = (customerId: string) => {
    console.log("[v0] Action menu toggled for customer:", customerId)
    setOpenActionMenus((prev) => ({
      ...prev,
      [customerId]: !prev[customerId],
    }))
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
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Clientes</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            Visualize e gerencie todos os seus clientes e seus perfis de risco
          </p>
        </div>
        <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>Adicione um novo cliente ao sistema</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome *
                </Label>
                <Input
                  id="name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  E-mail *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="document" className="text-right">
                  CPF/CNPJ *
                </Label>
                <Input
                  id="document"
                  value={newCustomer.document}
                  onChange={(e) => setNewCustomer({ ...newCustomer, document: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select
                  value={newCustomer.status}
                  onValueChange={(value: Customer["status"]) => setNewCustomer({ ...newCustomer, status: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="overdue">Em Atraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="riskLevel" className="text-right">
                  Nível de Risco
                </Label>
                <Select
                  value={newCustomer.riskLevel}
                  onValueChange={(value: Customer["riskLevel"]) => setNewCustomer({ ...newCustomer, riskLevel: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastContact" className="text-right">
                  Último Contato
                </Label>
                <Input
                  id="lastContact"
                  type="date"
                  value={newCustomer.lastContact}
                  onChange={(e) => setNewCustomer({ ...newCustomer, lastContact: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewCustomerOpen(false)} className="cursor-pointer">
                Cancelar
              </Button>
              <Button onClick={handleCreateCustomer} className="cursor-pointer">
                Criar Cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-lg">
                <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-lg">
                <UserCheck className="h-3 w-3 md:h-4 md:w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Ativos</p>
                <p className="text-lg md:text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-lg">
                <UserX className="h-3 w-3 md:h-4 md:w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Em Atraso</p>
                <p className="text-lg md:text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-orange-100 dark:bg-orange-900/20 p-2 rounded-lg">
                <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Críticos</p>
                <p className="text-lg md:text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1">
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-lg">
                <span className="text-purple-600 dark:text-purple-400 font-bold text-xs md:text-sm">R$</span>
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total Dívidas</p>
                <p className="text-sm md:text-lg font-bold">
                  R$ {stats.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-4 min-w-max">
              <TabsTrigger value="all" className="cursor-pointer text-xs md:text-sm whitespace-nowrap">
                Todos ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="active" className="cursor-pointer text-xs md:text-sm whitespace-nowrap">
                Ativos ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="cursor-pointer text-xs md:text-sm whitespace-nowrap">
                Em Atraso ({stats.overdue})
              </TabsTrigger>
              <TabsTrigger value="critical" className="cursor-pointer text-xs md:text-sm whitespace-nowrap">
                Críticos ({stats.critical})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar clientes..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2 md:space-x-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-32 cursor-pointer">
                  <Filter className="h-4 w-4 md:hidden" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    Todos
                  </SelectItem>
                  <SelectItem value="active" className="cursor-pointer">
                    Ativo
                  </SelectItem>
                  <SelectItem value="overdue" className="cursor-pointer">
                    Em Atraso
                  </SelectItem>
                  <SelectItem value="inactive" className="cursor-pointer">
                    Inativo
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-full md:w-32 cursor-pointer">
                  <Filter className="h-4 w-4 md:hidden" />
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    Todos
                  </SelectItem>
                  <SelectItem value="low" className="cursor-pointer">
                    Baixo
                  </SelectItem>
                  <SelectItem value="medium" className="cursor-pointer">
                    Médio
                  </SelectItem>
                  <SelectItem value="high" className="cursor-pointer">
                    Alto
                  </SelectItem>
                  <SelectItem value="critical" className="cursor-pointer">
                    Crítico
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Clientes</CardTitle>
              <CardDescription>Lista completa de clientes cadastrados no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="md:hidden space-y-4">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{customer.name}</h3>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                        <p className="text-xs text-gray-400 font-mono">{customer.document}</p>
                      </div>
                      <ActionButtons customer={customer} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Telefone</p>
                        <p className="font-medium">{customer.phone || "-"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Dívidas</p>
                        <p className="font-medium">{customer.totalDebts}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Valor Total</p>
                        <p className="font-medium">
                          R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Último Contato</p>
                        <p className="font-medium">
                          {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      {getStatusBadge(customer.status)}
                      {getRiskBadge(customer.riskLevel)}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Dívidas</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risco</TableHead>
                      <TableHead>Último Contato</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{customer.document}</TableCell>
                        <TableCell className="text-sm">{customer.phone || "-"}</TableCell>
                        <TableCell>
                          <span className="font-medium">{customer.totalDebts}</span>
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{getStatusBadge(customer.status)}</TableCell>
                        <TableCell>{getRiskBadge(customer.riskLevel)}</TableCell>
                        <TableCell>
                          {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                        <TableCell>
                          <ActionButtons customer={customer} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Ativos</CardTitle>
              <CardDescription>Clientes sem dívidas em atraso</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCustomers.length > 0 ? (
                <>
                  {/* Mobile view */}
                  <div className="md:hidden space-y-4">
                    {filteredCustomers.map((customer) => (
                      <Card key={customer.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{customer.name}</h3>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                            <p className="text-xs text-gray-400 font-mono">{customer.document}</p>
                          </div>
                          <ActionButtons customer={customer} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Telefone</p>
                            <p className="font-medium">{customer.phone || "-"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Valor Total</p>
                            <p className="font-medium">
                              R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Último Contato</p>
                            <p className="font-medium">
                              {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Risco</p>
                            <div>{getRiskBadge(customer.riskLevel)}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Risco</TableHead>
                          <TableHead>Último Contato</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-gray-500">{customer.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{customer.document}</TableCell>
                            <TableCell className="text-sm">{customer.phone || "-"}</TableCell>
                            <TableCell className="font-medium">
                              R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{getRiskBadge(customer.riskLevel)}</TableCell>
                            <TableCell>
                              {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                            </TableCell>
                            <TableCell>
                              <ActionButtons customer={customer} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <UserCheck className="mx-auto h-12 w-12 text-green-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">Nenhum cliente ativo encontrado</p>
                  <p className="text-gray-600 dark:text-gray-400">Ajuste os filtros para ver mais resultados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle>Clientes em Atraso</CardTitle>
              <CardDescription>Clientes com dívidas vencidas</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCustomers.length > 0 ? (
                <>
                  {/* Mobile view */}
                  <div className="md:hidden space-y-4">
                    {filteredCustomers.map((customer) => (
                      <Card key={customer.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{customer.name}</h3>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                            <p className="text-xs text-gray-400 font-mono">{customer.document}</p>
                          </div>
                          <ActionButtons customer={customer} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Telefone</p>
                            <p className="font-medium">{customer.phone || "-"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Valor Total</p>
                            <p className="font-medium">
                              R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Último Contato</p>
                            <p className="font-medium">
                              {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Risco</p>
                            <div>{getRiskBadge(customer.riskLevel)}</div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Risco</TableHead>
                          <TableHead>Último Contato</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-gray-500">{customer.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{customer.document}</TableCell>
                            <TableCell className="text-sm">{customer.phone || "-"}</TableCell>
                            <TableCell className="font-medium">
                              R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{getRiskBadge(customer.riskLevel)}</TableCell>
                            <TableCell>
                              {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                            </TableCell>
                            <TableCell>
                              <ActionButtons customer={customer} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <UserX className="mx-auto h-12 w-12 text-red-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Nenhum cliente em atraso encontrado
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">Ajuste os filtros para ver mais resultados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="critical">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Críticos</CardTitle>
              <CardDescription>Clientes com alto risco de inadimplência</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCustomers.length > 0 ? (
                <>
                  {/* Mobile view */}
                  <div className="md:hidden space-y-4">
                    {filteredCustomers.map((customer) => (
                      <Card key={customer.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-base">{customer.name}</h3>
                            <p className="text-sm text-gray-500">{customer.email}</p>
                            <p className="text-xs text-gray-400 font-mono">{customer.document}</p>
                          </div>
                          <ActionButtons customer={customer} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Telefone</p>
                            <p className="font-medium">{customer.phone || "-"}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Valor Total</p>
                            <p className="font-medium">
                              R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Status</p>
                            <div>{getStatusBadge(customer.status)}</div>
                          </div>
                          <div>
                            <p className="text-gray-500">Último Contato</p>
                            <p className="font-medium">
                              {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Documento</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Valor Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Último Contato</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCustomers.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{customer.name}</p>
                                <p className="text-sm text-gray-500">{customer.email}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{customer.document}</TableCell>
                            <TableCell className="text-sm">{customer.phone || "-"}</TableCell>
                            <TableCell className="font-medium">
                              R$ {customer.totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{getStatusBadge(customer.status)}</TableCell>
                            <TableCell>
                              {customer.lastContact ? new Date(customer.lastContact).toLocaleDateString("pt-BR") : "-"}
                            </TableCell>
                            <TableCell>
                              <ActionButtons customer={customer} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="mx-auto h-12 w-12 text-orange-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">Nenhum cliente crítico encontrado</p>
                  <p className="text-gray-600 dark:text-gray-400">Ajuste os filtros para ver mais resultados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contactType === "email" && "Enviar E-mail"}
              {contactType === "phone" && "Registrar Ligação"}
              {contactType === "whatsapp" && "Enviar WhatsApp"}
            </DialogTitle>
            <DialogDescription>{selectedCustomer && `Contato com ${selectedCustomer.name}`}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                Mensagem
              </Label>
              <Textarea
                id="message"
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                className="col-span-3"
                placeholder="Digite sua mensagem..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)} className="cursor-pointer">
              Cancelar
            </Button>
            <Button onClick={handleSendContact} className="cursor-pointer">
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
