import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createAuthClient } from "@/lib/supabase/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { companyId, tableName } = await request.json()

    if (!id || !tableName) {
      return NextResponse.json(
        { error: "Missing client ID or table name" },
        { status: 400 }
      )
    }

    // Verify the user is a super admin
    const authSupabase = await createAuthClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 })
    }

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "super_admin") {
      return NextResponse.json({ error: "Sem permissao" }, { status: 403 })
    }

    console.log("[Delete Client] ID:", id, "Table:", tableName, "Company:", companyId)

    // Get the client document to find related records
    const { data: clientData } = await supabase
      .from(tableName)
      .select('id, "CPF/CNPJ"')
      .eq("id", id)
      .single()

    const clientDocument = clientData?.["CPF/CNPJ"]?.replace(/\D/g, "") || null

    // Get ASAAS API key (try company-specific first, then global)
    let apiKey = process.env.ASAAS_API_KEY
    if (companyId) {
      const { data: company } = await supabase
        .from("companies")
        .select("asaas_api_key")
        .eq("id", companyId)
        .single()
      if (company?.asaas_api_key) {
        apiKey = company.asaas_api_key
      }
    }

    const asaasUrl = process.env.ASAAS_API_URL || "https://api.asaas.com/v3"

    // 1. Find related customer records and ASAAS data
    if (clientDocument) {
      const { data: customers } = await supabase
        .from("customers")
        .select("id")
        .eq("document", clientDocument)
        .eq("company_id", companyId)

      if (customers && customers.length > 0) {
        const customerIds = customers.map((c) => c.id)

        // Get agreements with ASAAS data before deleting
        const { data: agreements } = await supabase
          .from("agreements")
          .select("id, asaas_payment_id, asaas_customer_id")
          .in("customer_id", customerIds)

        // 1a. Delete ASAAS payments first
        if (apiKey && agreements && agreements.length > 0) {
          const asaasCustomerIds = new Set<string>()

          for (const agreement of agreements) {
            // Delete ASAAS payment
            if (agreement.asaas_payment_id) {
              try {
                const res = await fetch(`${asaasUrl}/payments/${agreement.asaas_payment_id}`, {
                  method: "DELETE",
                  headers: { "access_token": apiKey },
                })
                if (res.ok) {
                  console.log("[Delete Client] Deleted ASAAS payment:", agreement.asaas_payment_id)
                } else {
                  console.log("[Delete Client] ASAAS payment delete failed (may already be deleted):", agreement.asaas_payment_id)
                }
              } catch (e) {
                console.log("[Delete Client] ASAAS payment delete error:", agreement.asaas_payment_id)
              }
            }

            // Collect ASAAS customer IDs for later deletion
            if (agreement.asaas_customer_id) {
              asaasCustomerIds.add(agreement.asaas_customer_id)
            }
          }

          // 1b. Delete ASAAS customers
          for (const asaasCustomerId of asaasCustomerIds) {
            try {
              const res = await fetch(`${asaasUrl}/customers/${asaasCustomerId}`, {
                method: "DELETE",
                headers: { "access_token": apiKey },
              })
              if (res.ok) {
                console.log("[Delete Client] Deleted ASAAS customer:", asaasCustomerId)
              } else {
                console.log("[Delete Client] ASAAS customer delete failed (may have active charges):", asaasCustomerId)
              }
            } catch (e) {
              console.log("[Delete Client] ASAAS customer delete error:", asaasCustomerId)
            }
          }
        }

        // 1c. Also try to find ASAAS customer by CPF if no customer ID was stored
        if (apiKey && clientDocument) {
          try {
            const searchRes = await fetch(
              `${asaasUrl}/customers?cpfCnpj=${clientDocument}`,
              { headers: { "access_token": apiKey } }
            )
            const searchData = await searchRes.json()
            if (searchData?.data?.length > 0) {
              for (const customer of searchData.data) {
                try {
                  await fetch(`${asaasUrl}/customers/${customer.id}`, {
                    method: "DELETE",
                    headers: { "access_token": apiKey },
                  })
                  console.log("[Delete Client] Deleted ASAAS customer by CPF:", customer.id)
                } catch (e) {
                  console.log("[Delete Client] ASAAS customer by CPF delete error:", customer.id)
                }
              }
            }
          } catch (e) {
            console.log("[Delete Client] ASAAS customer search by CPF failed")
          }
        }

        // 2. Delete agreements from database
        const { error: agreementsError } = await supabase
          .from("agreements")
          .delete()
          .in("customer_id", customerIds)

        if (agreementsError) {
          console.log("[Delete Client] Agreements delete note:", agreementsError.message)
        } else {
          console.log("[Delete Client] Deleted agreements for customer IDs:", customerIds)
        }

        // 3. Delete debts from database
        const { error: debtsError } = await supabase
          .from("debts")
          .delete()
          .in("customer_id", customerIds)

        if (debtsError) {
          console.log("[Delete Client] Debts delete note:", debtsError.message)
        } else {
          console.log("[Delete Client] Deleted debts for customer IDs:", customerIds)
        }

        // 4. Delete the customers from database
        const { error: customersError } = await supabase
          .from("customers")
          .delete()
          .in("id", customerIds)

        if (customersError) {
          console.log("[Delete Client] Customers delete note:", customersError.message)
        } else {
          console.log("[Delete Client] Deleted customers:", customerIds)
        }
      }
    }

    // 5. Delete the client from the company-specific table (VMAX)
    const { error } = await supabase.from(tableName).delete().eq("id", id)

    if (error) {
      console.error("[Delete Client] Error deleting from", tableName, ":", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[Delete Client] Client deleted successfully from", tableName)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Delete Client] Exception:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
