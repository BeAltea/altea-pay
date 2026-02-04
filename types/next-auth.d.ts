import type { DefaultSession, DefaultUser } from "next-auth"
import type { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: string
      companyId: string | null
      fullName: string | null
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role?: string
    companyId?: string | null
    fullName?: string | null
    passwordHash?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role: string
    companyId: string | null
    fullName: string | null
  }
}
