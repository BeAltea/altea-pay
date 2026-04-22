/**
 * Script to create the localize_only demo user
 *
 * Run with: npx tsx scripts/create-localize-user.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables:")
  console.error("  NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "OK" : "MISSING")
  console.error("  SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "OK" : "MISSING")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createLocalizeUser() {
  const email = "localize@alteapay.com"
  const password = "Altea@2026"

  console.log("Creating localize_only user...")
  console.log("  Email:", email)
  console.log("  Password:", password)
  console.log("")

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existingUser = existingUsers?.users?.find(u => u.email === email)

  let userId: string

  if (existingUser) {
    console.log("User already exists with ID:", existingUser.id)
    userId = existingUser.id

    // Update password just in case
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password,
      email_confirm: true,
    })

    if (updateError) {
      console.error("Error updating user:", updateError.message)
    } else {
      console.log("Password updated successfully")
    }
  } else {
    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: "Localize Demo",
      },
    })

    if (createError) {
      console.error("Error creating user:", createError.message)
      process.exit(1)
    }

    console.log("User created with ID:", newUser.user.id)
    userId = newUser.user.id
  }

  // Create or update profile
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email: email,
      full_name: "Localize Demo",
      role: "localize_only",
      company_id: null,
    }, {
      onConflict: "id",
    })

  if (profileError) {
    console.error("Error creating profile:", profileError.message)
    process.exit(1)
  }

  console.log("Profile created/updated with role: localize_only")
  console.log("")
  console.log("=".repeat(50))
  console.log("SUCCESS! User ready for testing:")
  console.log("  URL: https://alteapay.com/auth/login")
  console.log("  Email:", email)
  console.log("  Password:", password)
  console.log("=".repeat(50))
}

createLocalizeUser().catch(console.error)
