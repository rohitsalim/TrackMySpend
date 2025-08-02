'use client'

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'
import { ChartWrapper } from './ChartWrapper'
import type { CategoryBreakdown } from '@/lib/utils/dashboard-data'

interface CategoryBreakdownChartProps {
  data: CategoryBreakdown[]
}

// Default color palette for categories without custom colors
const COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue  
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#84CC16', // Lime
]

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ payload: CategoryBreakdown }>
  }) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{data.categoryName}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{formatCurrency(data.amount)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Percentage:</span>
              <span className="font-medium">{data.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
    if (!cx || !cy || midAngle === undefined || !innerRadius || !outerRadius || percent === undefined) {
      return null
    }
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    // Only show label if percentage is greater than 5%
    if (percent < 0.05) return null

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <ChartWrapper 
      title="Category Breakdown" 
      description="Your spending distribution by category"
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="amount"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || COLORS[index % COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value: string) => (
              <span className="text-sm">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}