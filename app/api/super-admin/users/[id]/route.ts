import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { profiles, companies, users, sessions, accounts } from "@/lib/db/schema"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Fetch profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch company if exists
    let companyName: string | undefined
    if (profile.companyId) {
      const [company] = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, profile.companyId))
        .limit(1)
      companyName = company?.name
    }

    const userData = {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName || "Sem nome",
      role: profile.role || "user",
      companyName,
      companyId: profile.companyId,
      status: profile.status || "active",
      phone: profile.phone,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    }

    return NextResponse.json(userData)
  } catch (error) {
    console.error("[API] Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if the user exists
    const [existingProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)

    if (!existingProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check permissions - only super_admin can change roles to super_admin
    if (body.role === "super_admin" && existingProfile.role !== "super_admin") {
      const [currentProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, session.user.id))
        .limit(1)

      if (currentProfile?.role !== "super_admin") {
        return NextResponse.json({ error: "Only super admins can promote users to super admin" }, { status: 403 })
      }
    }

    // Update the profile
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (body.fullName !== undefined) updateData.fullName = body.fullName
    if (body.email !== undefined) updateData.email = body.email
    if (body.role !== undefined) updateData.role = body.role
    if (body.status !== undefined) updateData.status = body.status
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.companyId !== undefined) updateData.companyId = body.companyId || null

    await db
      .update(profiles)
      .set(updateData)
      .where(eq(profiles.id, id))

    // Also update email in users table if changed
    if (body.email && body.email !== existingProfile.email) {
      await db
        .update(users)
        .set({ email: body.email, updatedAt: new Date() })
        .where(eq(users.id, id))
    }

    console.log("[API] User updated successfully:", id)

    // Fetch updated profile to return
    const [updatedProfile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)

    let companyName: string | undefined
    if (updatedProfile?.companyId) {
      const [company] = await db
        .select({ name: companies.name })
        .from(companies)
        .where(eq(companies.id, updatedProfile.companyId))
        .limit(1)
      companyName = company?.name
    }

    return NextResponse.json({
      id: updatedProfile?.id,
      email: updatedProfile?.email,
      fullName: updatedProfile?.fullName || "Sem nome",
      role: updatedProfile?.role || "user",
      companyName,
      companyId: updatedProfile?.companyId,
      status: updatedProfile?.status || "active",
      phone: updatedProfile?.phone,
      updatedAt: updatedProfile?.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error("[API] Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Check if the user exists
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1)

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Prevent self-deletion
    if (profile.id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Prevent deletion of super_admin by non-super_admin
    if (profile.role === "super_admin") {
      // Check if current user is super_admin
      const [currentProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, session.user.id))
        .limit(1)

      if (currentProfile?.role !== "super_admin") {
        return NextResponse.json({ error: "Only super admins can delete other super admins" }, { status: 403 })
      }
    }

    // Delete in order: sessions -> accounts -> profile -> user
    // Delete sessions
    await db.delete(sessions).where(eq(sessions.userId, id))

    // Delete accounts
    await db.delete(accounts).where(eq(accounts.userId, id))

    // Delete profile
    await db.delete(profiles).where(eq(profiles.id, id))

    // Delete user
    await db.delete(users).where(eq(users.id, id))

    console.log("[API] User deleted successfully:", id)

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("[API] Error deleting user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
