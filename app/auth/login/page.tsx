import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-altea-navy flex items-center justify-center">
          <div className="text-white">Carregando...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
