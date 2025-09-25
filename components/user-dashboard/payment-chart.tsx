"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface PaymentChartProps {
  data: Array<{
    month: string
    amount: number
  }>
}

export function PaymentChart({ data }: PaymentChartProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis
            tickFormatter={(value) =>
              `R$ ${value.toLocaleString("pt-BR", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}`
            }
          />
          <Tooltip
            formatter={(value: number) => [
              `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
              "Valor Pago",
            ]}
            labelStyle={{ color: "#000" }}
          />
          <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
