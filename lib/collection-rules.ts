// Collection Rules API client functions

export interface CollectionRuleStep {
  id: string
  stepOrder: number
  daysAfterDue: number
  actionType: "email" | "sms" | "whatsapp" | "call" | "letter"
  templateSubject?: string
  templateContent: string
  isActive: boolean
}

export interface CollectionRule {
  id: string
  name: string
  description: string
  isActive: boolean
  steps: CollectionRuleStep[]
  createdAt: string
  updatedAt: string
}

export async function fetchCollectionRules(): Promise<CollectionRule[]> {
  try {
    const response = await fetch("/api/collection-rules")
    if (!response.ok) {
      throw new Error("Failed to fetch collection rules")
    }
    const data = await response.json()
    return data.rules || []
  } catch (error) {
    console.error("Error fetching collection rules:", error)
    return []
  }
}

export async function createCollectionRule(
  name: string,
  description: string,
  steps: Omit<CollectionRuleStep, "id">[],
): Promise<CollectionRule | null> {
  try {
    // Add IDs to steps
    const stepsWithIds = steps.map((step, index) => ({
      ...step,
      id: `step-${Date.now()}-${index}`,
      stepOrder: index + 1,
    }))

    const response = await fetch("/api/collection-rules", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        steps: stepsWithIds,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to create collection rule")
    }

    const data = await response.json()
    return data.rule
  } catch (error) {
    console.error("Error creating collection rule:", error)
    return null
  }
}

export async function updateCollectionRule(
  id: string,
  name: string,
  description: string,
  steps: CollectionRuleStep[],
  isActive: boolean,
): Promise<CollectionRule | null> {
  try {
    const response = await fetch(`/api/collection-rules/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        steps,
        isActive,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to update collection rule")
    }

    const data = await response.json()
    return data.rule
  } catch (error) {
    console.error("Error updating collection rule:", error)
    return null
  }
}

export async function deleteCollectionRule(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/collection-rules/${id}`, {
      method: "DELETE",
    })

    if (!response.ok) {
      throw new Error("Failed to delete collection rule")
    }

    return true
  } catch (error) {
    console.error("Error deleting collection rule:", error)
    return false
  }
}

export async function toggleCollectionRule(id: string, isActive: boolean): Promise<boolean> {
  try {
    const response = await fetch(`/api/collection-rules/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        isActive,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to toggle collection rule")
    }

    return true
  } catch (error) {
    console.error("Error toggling collection rule:", error)
    return false
  }
}
