"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Upload, TestTube } from "lucide-react"
import {
  testERPConnection,
  syncCustomersFromERP,
  syncDebtsFromERP,
  syncResultsToERP,
} from "@/app/actions/erp-integration"

interface SyncButtonsProps {
  integrationId: string
  companyId: string
}

export function SyncButtons({ integrationId, companyId }: SyncButtonsProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isSyncingCustomers, setIsSyncingCustomers] = useState(false)
  const [isSyncingDebts, setIsSyncingDebts] = useState(false)
  const [isSyncingResults, setIsSyncingResults] = useState(false)
  const { toast } = useToast()

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    try {
      const result = await testERPConnection(integrationId)
      toast({
        title: result.success ? "Conexão bem-sucedida" : "Falha na conexão",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao testar conexão",
        variant: "destructive",
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSyncCustomers = async () => {
    setIsSyncingCustomers(true)
    try {
      const result = await syncCustomersFromERP(integrationId, companyId)
      toast({
        title: result.success ? "Sincronização concluída" : "Erro na sincronização",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao sincronizar clientes",
        variant: "destructive",
      })
    } finally {
      setIsSyncingCustomers(false)
    }
  }

  const handleSyncDebts = async () => {
    setIsSyncingDebts(true)
    try {
      const result = await syncDebtsFromERP(integrationId, companyId)
      toast({
        title: result.success ? "Sincronização concluída" : "Erro na sincronização",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao sincronizar dívidas",
        variant: "destructive",
      })
    } finally {
      setIsSyncingDebts(false)
    }
  }

  const handleSyncResults = async () => {
    setIsSyncingResults(true)
    try {
      const result = await syncResultsToERP(integrationId, companyId)
      toast({
        title: result.success ? "Sincronização concluída" : "Erro na sincronização",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao sincronizar resultados",
        variant: "destructive",
      })
    } finally {
      setIsSyncingResults(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleTestConnection} disabled={isTestingConnection} variant="outline" size="sm">
        <TestTube className="mr-2 h-4 w-4" />
        {isTestingConnection ? "Testando..." : "Testar Conexão"}
      </Button>

      <Button onClick={handleSyncCustomers} disabled={isSyncingCustomers} variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        {isSyncingCustomers ? "Sincronizando..." : "Sincronizar Clientes"}
      </Button>

      <Button onClick={handleSyncDebts} disabled={isSyncingDebts} variant="outline" size="sm">
        <Download className="mr-2 h-4 w-4" />
        {isSyncingDebts ? "Sincronizando..." : "Sincronizar Dívidas"}
      </Button>

      <Button onClick={handleSyncResults} disabled={isSyncingResults} variant="outline" size="sm">
        <Upload className="mr-2 h-4 w-4" />
        {isSyncingResults ? "Enviando..." : "Enviar Resultados"}
      </Button>
    </div>
  )
}
