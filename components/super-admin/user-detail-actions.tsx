"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
import { UserX, UserPlus, Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserDetailActionsProps {
  userId: string
  userName: string
  userEmail: string
  companyName?: string
  currentStatus: "active" | "inactive" | "suspended"
}

export function UserDetailActions({
  userId,
  userName,
  userEmail,
  companyName,
  currentStatus,
}: UserDetailActionsProps) {
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; action: "suspend" | "reactivate" }>({
    open: false,
    action: "suspend",
  })
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleSuspendClick = (action: "suspend" | "reactivate") => {
    setSuspendDialog({ open: true, action })
  }

  const handleSuspendConfirm = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/super-admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: suspendDialog.action }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao processar solicitação")
      }

      toast({
        title: suspendDialog.action === "suspend" ? "Usuário suspenso" : "Usuário reativado",
        description: `${userName} foi ${suspendDialog.action === "suspend" ? "suspenso" : "reativado"} com sucesso.`,
      })

      setSuspendDialog({ open: false, action: "suspend" })
      router.refresh()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (deleteConfirmText !== "EXCLUIR") return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao excluir usuário")
      }

      toast({
        title: "Usuário excluído",
        description: `${userName} foi excluído permanentemente.`,
      })

      router.push("/super-admin/users")
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Suspend/Reactivate Button */}
      {currentStatus === "suspended" ? (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => handleSuspendClick("reactivate")}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Reativar Usuário
        </Button>
      ) : (
        <Button
          className="w-full"
          variant="outline"
          onClick={() => handleSuspendClick("suspend")}
        >
          <UserX className="mr-2 h-4 w-4" />
          Suspender Usuário
        </Button>
      )}

      {/* Delete Button */}
      <Button
        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        variant="outline"
        onClick={() => setDeleteDialog(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Excluir Usuário
      </Button>

      {/* Suspend/Reactivate Dialog */}
      <Dialog
        open={suspendDialog.open}
        onOpenChange={(open) => !isProcessing && setSuspendDialog({ ...suspendDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              {suspendDialog.action === "suspend" ? "Suspender Usuário" : "Reativar Usuário"}
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                {suspendDialog.action === "suspend" ? (
                  <>
                    <p>Tem certeza que deseja suspender o acesso de:</p>
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium">{userName}</p>
                      <p className="text-sm text-gray-500">{userEmail}</p>
                      {companyName && <p className="text-sm text-gray-500">{companyName}</p>}
                    </div>
                    <p className="mt-3">O usuário não poderá acessar a plataforma até ser reativado.</p>
                  </>
                ) : (
                  <>
                    <p>Tem certeza que deseja reativar o acesso de:</p>
                    <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium">{userName}</p>
                      <p className="text-sm text-gray-500">{userEmail}</p>
                      {companyName && <p className="text-sm text-gray-500">{companyName}</p>}
                    </div>
                    <p className="mt-3">O usuário poderá acessar a plataforma normalmente.</p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuspendDialog({ open: false, action: "suspend" })}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant={suspendDialog.action === "suspend" ? "destructive" : "default"}
              onClick={handleSuspendConfirm}
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {suspendDialog.action === "suspend" ? "Suspender Acesso" : "Reativar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialog}
        onOpenChange={(open) => {
          if (!isProcessing) {
            setDeleteDialog(open)
            if (!open) setDeleteConfirmText("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Excluir Usuário
            </DialogTitle>
            <DialogDescription asChild>
              <div>
                <p className="font-semibold text-red-600">Esta ação é IRREVERSÍVEL.</p>
                <p className="mt-2">O usuário será permanentemente removido da plataforma:</p>
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="font-medium text-red-800 dark:text-red-300">{userName}</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{userEmail}</p>
                  {companyName && <p className="text-sm text-red-600 dark:text-red-400">{companyName}</p>}
                </div>
                <p className="mt-4">
                  Digite <span className="font-mono font-bold">EXCLUIR</span> para confirmar:
                </p>
                <Input
                  className="mt-2"
                  placeholder="Digite EXCLUIR"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  disabled={isProcessing}
                />
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialog(false)
                setDeleteConfirmText("")
              }}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmText !== "EXCLUIR" || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
