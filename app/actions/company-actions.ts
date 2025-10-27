"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface CreateCompanyParams {
  name: string
  cnpj: string
  email: string
  phone: string
  address?: string
  city?: string
  state?: string
  zipcode?: string
  status: "active" | "inactive" | "suspended"
}

export interface UpdateCompanyParams extends CreateCompanyParams {
  id: string
}

export interface DeleteCompanyParams {
  id: string
}

export async function createCompany(params: CreateCompanyParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: params.name,
        cnpj: params.cnpj,
        email: params.email,
        phone: params.phone,
        address: params.address || null,
        city: params.city || null,
        state: params.state || null,
        zipcode: params.zipcode || null,
        status: params.status,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath("/super-admin/companies")

    return {
      success: true,
      message: "Empresa criada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Create company error:", error)
    return {
      success: false,
      message: "Erro ao criar empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function updateCompany(params: UpdateCompanyParams) {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("companies")
      .update({
        name: params.name,
        cnpj: params.cnpj,
        email: params.email,
        phone: params.phone,
        address: params.address || null,
        city: params.city || null,
        state: params.state || null,
        zipcode: params.zipcode || null,
        status: params.status,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath("/super-admin/companies")
    revalidatePath(`/super-admin/companies/${params.id}`)

    return {
      success: true,
      message: "Empresa atualizada com sucesso!",
      data,
    }
  } catch (error) {
    console.error("[v0] Update company error:", error)
    return {
      success: false,
      message: "Erro ao atualizar empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function deleteCompany(params: DeleteCompanyParams) {
  try {
    const supabase = await createClient()

    // Check if company has users or data
    const { data: users } = await supabase.from("profiles").select("id").eq("company_id", params.id).limit(1)

    if (users && users.length > 0) {
      return {
        success: false,
        message: "Não é possível excluir empresa com usuários cadastrados",
      }
    }

    const { error } = await supabase.from("companies").delete().eq("id", params.id)

    if (error) throw error

    revalidatePath("/super-admin/companies")

    return {
      success: true,
      message: "Empresa excluída com sucesso!",
    }
  } catch (error) {
    console.error("[v0] Delete company error:", error)
    return {
      success: false,
      message: "Erro ao excluir empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function createCompanyWithCustomers(formData: FormData) {
  try {
    console.log("[v0] Creating company with customers...")
    const supabase = await createClient()

    // Extract company data
    const companyData = {
      name: formData.get("name") as string,
      cnpj: formData.get("cnpj") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: (formData.get("address") as string) || null,
      city: (formData.get("city") as string) || null,
      state: (formData.get("state") as string) || null,
      zip_code: (formData.get("zip_code") as string) || null,
      sector: (formData.get("sector") as string) || null,
    }

    console.log("[v0] Company data:", companyData)

    // Create company
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert(companyData)
      .select()
      .single()

    if (companyError) {
      console.error("[v0] Company creation error:", companyError)
      throw companyError
    }

    console.log("[v0] Company created:", company.id)

    // Process customer file if provided
    const customerFile = formData.get("customerFile") as File
    let importedCount = 0
    let failedCount = 0

    if (customerFile && customerFile.size > 0) {
      console.log("[v0] Processing customer file:", customerFile.name)

      const text = await customerFile.text()
      const lines = text.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

      console.log("[v0] CSV headers:", headers)

      // Map headers to database columns
      const headerMap: Record<string, string> = {
        nome: "name",
        name: "name",
        email: "email",
        telefone: "phone",
        phone: "phone",
        documento: "document",
        cpf: "document",
        cnpj: "document",
        document: "document",
        endereco: "address",
        address: "address",
        cidade: "city",
        city: "city",
        estado: "state",
        state: "state",
        cep: "zip_code",
        zipcode: "zip_code",
        zip_code: "zip_code",
      }

      const customers = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim())
        const customer: any = {
          company_id: company.id,
        }

        headers.forEach((header, index) => {
          const dbColumn = headerMap[header]
          if (dbColumn && values[index]) {
            customer[dbColumn] = values[index]
          }
        })

        // Determine document type
        if (customer.document) {
          const cleanDoc = customer.document.replace(/\D/g, "")
          customer.document_type = cleanDoc.length === 11 ? "CPF" : "CNPJ"
        }

        if (customer.name) {
          customers.push(customer)
        }
      }

      console.log("[v0] Parsed customers:", customers.length)

      // Insert customers in batches
      if (customers.length > 0) {
        const { data: insertedCustomers, error: customersError } = await supabase
          .from("customers")
          .insert(customers)
          .select()

        if (customersError) {
          console.error("[v0] Customers import error:", customersError)
          failedCount = customers.length
        } else {
          importedCount = insertedCustomers?.length || 0
          console.log("[v0] Customers imported:", importedCount)
        }
      }
    }

    revalidatePath("/super-admin/companies")

    return {
      success: true,
      message: `Empresa criada com sucesso! ${importedCount > 0 ? `${importedCount} clientes importados.` : ""}${failedCount > 0 ? ` ${failedCount} falharam.` : ""}`,
      data: { company, importedCount, failedCount },
    }
  } catch (error) {
    console.error("[v0] Create company with customers error:", error)
    return {
      success: false,
      message: "Erro ao criar empresa",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
