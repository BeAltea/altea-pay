import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

// Edge-compatible auth config for middleware (no DB imports)
// Only JWT verification — no database adapter
export const { auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: () => null,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user as any).role ?? "user"
        token.companyId = (user as any).companyId ?? null
        token.fullName = (user as any).fullName ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id
        session.user.role = token.role
        session.user.companyId = token.companyId
        session.user.fullName = token.fullName
      }
      return session
    },
  },
})
