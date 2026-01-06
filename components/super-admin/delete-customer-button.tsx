"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteCustomer } from "@/app/actions/delete-customer"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface DeleteCustomerButtonProps {
  customerId: string
  customerName: string
  companyId: string
}

export function DeleteCustomerButton({ customerId, customerName, companyId }: DeleteCustomerButtonProps) {
  const router = useRouter()

  const handleDelete = async () => {
    const confirmed = confirm(
      `Tem certeza que deseja excluir permanentemente o cliente ${customerName}?\n\nEsta ação não pode ser desfeita e removerá todos os dados associados.`,
    )

    if (!confirmed) return

    const result = await deleteCustomer(customerId, companyId)

    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-red-200 hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 bg-transparent"
      onClick={handleDelete}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
