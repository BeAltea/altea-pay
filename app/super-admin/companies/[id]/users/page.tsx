import { redirect } from "next/navigation"

interface UsersPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function UsersPage({ params }: UsersPageProps) {
  const { id } = await params
  redirect(`/super-admin/companies/${id}/users/manage`)
}
