import { redirect } from "next/navigation"

interface UsersPageProps {
  params: {
    id: string
  }
}

export default function UsersPage({ params }: UsersPageProps) {
  redirect(`/super-admin/companies/${params.id}/users/manage`)
}
