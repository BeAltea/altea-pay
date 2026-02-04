import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { profiles } from "@/lib/db/schema"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    // Verify authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId, profileData } = await request.json()

    // Verify that the user is updating their own profile or is an admin
    if (session.user.id !== userId && session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if profile exists
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)

    let result

    if (existingProfile) {
      // Update existing profile
      const [updated] = await db
        .update(profiles)
        .set({
          email: profileData.email,
          fullName: profileData.full_name,
          companyId: profileData.company_id,
          phone: profileData.phone,
          cpfCnpj: profileData.cpf_cnpj,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, userId))
        .returning()

      result = updated
    } else {
      // Insert new profile
      const [inserted] = await db
        .insert(profiles)
        .values({
          id: userId,
          email: profileData.email,
          fullName: profileData.full_name,
          companyId: profileData.company_id,
          role: profileData.role || "user",
          phone: profileData.phone,
          cpfCnpj: profileData.cpf_cnpj,
          updatedAt: new Date(),
        })
        .returning()

      result = inserted
    }

    return NextResponse.json({ success: true, profile: result })
  } catch (error) {
    console.error("[v0] Error saving profile:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Erro desconhecido" }, { status: 500 })
  }
}
