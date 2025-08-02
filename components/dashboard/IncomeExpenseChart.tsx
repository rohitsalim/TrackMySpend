'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'
import { ChartWrapper } from './ChartWrapper'
import type { MonthlyData } from '@/lib/utils/dashboard-data'

interface IncomeExpenseChartProps {
  data: MonthlyData[]
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `₹${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(0)}K`
    }
    return `₹${value}`
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; name: string; color: string }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <ChartWrapper 
      title="Income vs Expenses" 
      description="Monthly trend of your income and expenses"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="monthName" 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis 
            tickFormatter={formatYAxis}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="#10B981"
            fillOpacity={1}
            fill="url(#colorIncome)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            name="Expenses"
            stroke="#EF4444"
            fillOpacity={1}
            fill="url(#colorExpenses)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}