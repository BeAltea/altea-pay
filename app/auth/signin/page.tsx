"use client"

import type React from "react"
import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"

const SignInPage = () => {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)
      const email = formData.get("email") as string
      const password = formData.get("password") as string

      const supabase = createBrowserClient()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
    } catch (err) {
      setError("An error occurred during sign-in.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Sign In</h1>
      <form onSubmit={handleSignIn}>
        <input type="email" name="email" placeholder="Email" required />
        <input type="password" name="password" placeholder="Password" required />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Sign In"}
        </button>
      </form>
      {error && <p>{error}</p>}
    </div>
  )
}

export default SignInPage
