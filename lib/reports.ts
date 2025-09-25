// Reports API client functions

export interface KPIData {
  totalDebt: number
  recoveredAmount: number
  recoveryRate: number
  activeCustomers: number
  overdueCustomers: number
  averageRecoveryTime: number
  totalActions: number
  successfulActions: number
}

export interface RecoveryTrendData {
  month: string
  recovered: number
  target: number
}

export interface ClassificationData {
  name: string
  value: number
  color: string
}

export interface ChannelPerformanceData {
  channel: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  converted: number
}

export interface AgingReportData {
  range: string
  count: number
  amount: number
}

export async function fetchKPIs(period = "30d"): Promise<KPIData | null> {
  try {
    const response = await fetch(`/api/reports/kpis?period=${period}`)
    if (!response.ok) {
      throw new Error("Failed to fetch KPIs")
    }
    const data = await response.json()
    return data.kpis
  } catch (error) {
    console.error("Error fetching KPIs:", error)
    return null
  }
}

export async function fetchRecoveryTrend(period = "6m"): Promise<RecoveryTrendData[]> {
  try {
    const response = await fetch(`/api/reports/recovery-trend?period=${period}`)
    if (!response.ok) {
      throw new Error("Failed to fetch recovery trend")
    }
    const data = await response.json()
    return data.trend || []
  } catch (error) {
    console.error("Error fetching recovery trend:", error)
    return []
  }
}

export async function fetchClassificationData(): Promise<ClassificationData[]> {
  try {
    const response = await fetch("/api/reports/classification")
    if (!response.ok) {
      throw new Error("Failed to fetch classification data")
    }
    const data = await response.json()
    return data.classification || []
  } catch (error) {
    console.error("Error fetching classification data:", error)
    return []
  }
}

export async function fetchChannelPerformance(period = "30d"): Promise<ChannelPerformanceData[]> {
  try {
    const response = await fetch(`/api/reports/channel-performance?period=${period}`)
    if (!response.ok) {
      throw new Error("Failed to fetch channel performance")
    }
    const data = await response.json()
    return data.performance || []
  } catch (error) {
    console.error("Error fetching channel performance:", error)
    return []
  }
}

export async function fetchAgingReport(): Promise<AgingReportData[]> {
  try {
    const response = await fetch("/api/reports/aging")
    if (!response.ok) {
      throw new Error("Failed to fetch aging report")
    }
    const data = await response.json()
    return data.aging || []
  } catch (error) {
    console.error("Error fetching aging report:", error)
    return []
  }
}

export async function exportReport(reportType: string, period = "30d"): Promise<Blob | null> {
  try {
    const response = await fetch(`/api/reports/export?type=${reportType}&period=${period}`)
    if (!response.ok) {
      throw new Error("Failed to export report")
    }
    return await response.blob()
  } catch (error) {
    console.error("Error exporting report:", error)
    return null
  }
}
