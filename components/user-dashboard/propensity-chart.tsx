"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface PropensityChartProps {
  paymentScore: number
  loanScore: number
}

export function PropensityChart({ paymentScore, loanScore }: PropensityChartProps) {
  // Mock historical data - in a real app, this would come from the database
  const data = [
    { month: "Jan", payment: 45.2, loan: 32.1 },
    { month: "Fev", payment: 52.8, loan: 38.5 },
    { month: "Mar", payment: 48.1, loan: 41.2 },
    { month: "Abr", payment: 61.3, loan: 45.8 },
    { month: "Mai", payment: 58.7, loan: 52.3 },
    { month: "Jun", payment: paymentScore, loan: loanScore },
  ]

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-muted-foreground" fontSize={12} />
          <YAxis className="text-muted-foreground" fontSize={12} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="payment"
            stroke="#1e40af"
            strokeWidth={2}
            name="Propensão ao Pagamento"
            dot={{ fill: "#1e40af", strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="loan"
            stroke="#f59e0b"
            strokeWidth={2}
            name="Propensão a Empréstimo"
            dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
