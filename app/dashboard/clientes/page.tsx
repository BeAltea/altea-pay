import { createServerClient, createAdminClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye, Sparkles, AlertCircle } from 'lucide-react'

export default async function ClientesPage() {
  try {
    const supabase = await createServerClient()
    const adminSupabase = createAdminClient()

    console.log("[v0] 🚀 Iniciando página de clientes...")

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log("[v0] 👤 Usuário:", user?.id, "Erro:", userError)

    if (userError || !user) {
      redirect("/auth/login")
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id, role, full_name")
      .eq("id", user.id)
      .single()

    console.log("[v0] 📋 Perfil:", profile, "Erro:", profileError)

    if (!profile?.company_id) {
      return <div className="p-8">Empresa não encontrada para o usuário</div>
    }

    const { data: company } = await supabase
      .from("companies")
      .select("id, name")
      .eq("id", profile.company_id)
      .single()

    console.log("[v0] 🏢 Empresa:", company?.name)

    const { data: allVmaxCustomers, error: vmaxError } = await supabase.from("VMAX").select("*")

    console.log("[v0] 📊 Total VMAX no banco:", allVmaxCustomers?.length, "Erro:", vmaxError)

    const vmaxCustomers =
      allVmaxCustomers?.filter(
        (customer) =>
          customer.id_company?.toString().toLowerCase().trim() ===
          profile.company_id.toString().toLowerCase().trim()
      ) || []

    console.log("[v0] ✅ VMAX da empresa:", vmaxCustomers.length)

    const vmaxIds = vmaxCustomers.map((c) => c.id).filter(Boolean)
    
    console.log("[v0] 🔍 Buscando credit profiles para", vmaxIds.length, "IDs")
    
    let creditProfiles: any[] = []
    
    if (vmaxIds.length > 0) {
      const { data: profiles, error: profilesError } = await adminSupabase
        .from("credit_profiles")
        .select("*")
        .in("customer_id", vmaxIds)
      
      console.log("[v0] 📋 Credit profiles por customer_id:", profiles?.length || 0, "Erro:", profilesError)
      
      creditProfiles = profiles || []
      
      if (creditProfiles.length === 0) {
        const cpfList = vmaxCustomers
          .map((c) => c["CPF/CNPJ"]?.replace(/\D/g, ""))
          .filter(Boolean)
        
        console.log("[v0] 🔍 Tentando busca fallback por CPF...") 
        
        const { data: profilesByCpf, error: cpfError } = await adminSupabase
          .from("credit_profiles")
          .select("*")
          .in("cpf", cpfList)
        
        console.log("[v0] 📋 Credit profiles por CPF:", profilesByCpf?.length || 0, "Erro:", cpfError)
        creditProfiles = profilesByCpf || []
      }
    }

    console.log("[v0] ✅ Total de análises de crédito encontradas:", creditProfiles.length)

    const creditProfilesMap = new Map(
      creditProfiles.map(profile => [profile.customer_id || profile.cpf, profile])
    )

    const clientesCompletos = vmaxCustomers.map(cliente => {
      const cleanCpf = cliente["CPF/CNPJ"]?.replace(/\D/g, "")
      const creditProfile = creditProfilesMap.get(cliente.id) || creditProfilesMap.get(cleanCpf)
      
      return {
        ...cliente,
        creditProfile: creditProfile || null,
        nome_display: cliente.Nome || cliente.Cliente || "N/A"
      }
    })

    console.log("[v0] 🎉 Renderizando", clientesCompletos.length, "clientes completos")

    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Todos os clientes da empresa {company?.name} | {creditProfiles.length} com análise de crédito
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {clientesCompletos.length} clientes
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clientesCompletos.map((cliente) => (
            <Card key={cliente.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-start justify-between gap-2">
                  <span className="line-clamp-2">{cliente.nome_display}</span>
                  {cliente.creditProfile?.is_consolidated && (
                    <Badge className="bg-purple-600 shrink-0 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Completo
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground font-mono">
                  {cliente["CPF/CNPJ"] || "N/A"}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {cliente.creditProfile?.score_assertiva !== null && cliente.creditProfile?.score_assertiva !== undefined && (
                  <div className="border rounded-lg p-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-600 font-semibold">Score de Crédito</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-600">{cliente.creditProfile.score_assertiva}</div>
                    <p className="text-xs text-muted-foreground mt-1">Análise Assertiva</p>
                  </div>
                )}
    
                {cliente.creditProfile && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {cliente.creditProfile.risk_level && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted">
                        <span className="text-muted-foreground">Risco:</span>
                        <Badge variant={
                          cliente.creditProfile.risk_level === 'low' ? 'default' :
                          cliente.creditProfile.risk_level === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {cliente.creditProfile.risk_level}
                        </Badge>
                      </div>
                    )}
                    {cliente.creditProfile.sanctions_count !== null && cliente.creditProfile.sanctions_count !== undefined && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted">
                        <span className="text-muted-foreground">Sanções:</span>
                        <Badge variant="destructive">{cliente.creditProfile.sanctions_count}</Badge>
                      </div>
                    )}
                    {cliente.creditProfile.has_sanctions !== null && cliente.creditProfile.has_sanctions !== undefined && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted">
                        <span className="text-muted-foreground">Tem Sanções:</span>
                        <Badge variant={cliente.creditProfile.has_sanctions ? 'destructive' : 'default'}>
                          {cliente.creditProfile.has_sanctions ? 'Sim' : 'Não'}
                        </Badge>
                      </div>
                    )}
                    {cliente.creditProfile.has_public_bonds !== null && cliente.creditProfile.has_public_bonds !== undefined && (
                      <div className="flex items-center justify-between p-2 rounded bg-muted">
                        <span className="text-muted-foreground">Vínc. Público:</span>
                        <Badge variant={cliente.creditProfile.has_public_bonds ? 'secondary' : 'outline'}>
                          {cliente.creditProfile.has_public_bonds ? 'Sim' : 'Não'}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cidade:</span>
                  <span className="font-medium">{cliente.Cidade || "N/A"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">UF:</span>
                  <span className="font-medium">{cliente.UF || "N/A"}</span>
                </div>
                
                {cliente["Dias_Inad"] && cliente["Dias_Inad"] > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Dias Inadimplência:</span>
                    <Badge
                      variant="destructive"
                      className={
                        cliente["Dias_Inad"] <= 30
                          ? "bg-yellow-500"
                          : cliente["Dias_Inad"] <= 60
                            ? "bg-orange-500"
                            : cliente["Dias_Inad"] <= 90
                              ? "bg-red-500"
                              : "bg-red-700"
                      }
                    >
                      {cliente["Dias_Inad"]} dias
                    </Badge>
                  </div>
                )}
                
                {cliente.Vencido && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor Vencido:</span>
                    <span className="font-semibold text-red-600">
                      R$ {parseFloat(cliente.Vencido.toString().replace(",", ".")).toFixed(2)}
                    </span>
                  </div>
                )}
                
                {cliente.creditProfile?.data_assertiva?.debitos && cliente.creditProfile.data_assertiva.debitos.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                    <span className="text-xs text-red-600 font-medium">
                      {cliente.creditProfile.data_assertiva.debitos.length} débito(s) ativo(s)
                    </span>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    asChild 
                    variant="outline" 
                    size="sm" 
                    className="w-full gap-2"
                  >
                    <Link href={`/dashboard/clientes/${cliente.id}`}>
                      <Eye className="h-4 w-4" />
                      Ver Detalhes Completos
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {clientesCompletos.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Nenhum cliente encontrado para esta empresa
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    )
  } catch (error) {
    console.error("[v0] ❌ Erro na página de clientes:", error)
    return (
      <div className="p-8">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao carregar clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro ao carregar os clientes. Detalhes: {error instanceof Error ? error.message : 'Erro desconhecido'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }
}
