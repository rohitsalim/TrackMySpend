'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils/formatters'
import { ChartWrapper } from './ChartWrapper'
import type { MonthlyComparison } from '@/lib/utils/dashboard-data'
import { TrendingUp, TrendingDown, BarChart3, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface MonthlyComparisonChartProps {
  data: MonthlyComparison[]
  currentMonth: string
  previousMonth: string
}

export function MonthlyComparisonChart({ 
  data, 
  currentMonth, 
  previousMonth 
}: MonthlyComparisonChartProps) {
  const router = useRouter()
  
  // Show empty state if no data
  if (!data || data.length === 0) {
    return (
      <ChartWrapper 
        title="Monthly Comparison" 
        description="Category spending compared to last month"
      >
        <div className="flex flex-col items-center justify-center h-full py-8">
          <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground/70" />
          </div>
          <h3 className="text-base font-medium text-foreground mb-2">
            Not enough data for comparison
          </h3>
          <p className="text-xs text-muted-foreground text-center max-w-[250px] leading-relaxed">
            Need at least two months of data to show comparisons
          </p>
          <Button 
            onClick={() => router.push('/transactions')}
            size="sm"
            className="mt-4"
          >
            View Transactions
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </ChartWrapper>
    )
  }

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
    payload?: Array<{ payload: MonthlyComparison }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MonthlyComparison
      const isIncrease = data.change > 0
      
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{currentMonth}:</span>
              <span className="font-medium">{formatCurrency(data.currentMonth)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{previousMonth}:</span>
              <span className="font-medium">{formatCurrency(data.previousMonth)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <span className="text-muted-foreground">Change:</span>
              <div className="flex items-center gap-1">
                {isIncrease ? (
                  <TrendingUp className="h-3 w-3 text-red-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500" />
                )}
                <span className={`font-medium ${isIncrease ? 'text-red-500' : 'text-green-500'}`}>
                  {data.changePercentage > 0 ? '+' : ''}{data.changePercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <ChartWrapper 
      title="Monthly Comparison" 
      description="Category spending compared to last month"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="category" 
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            tickFormatter={formatYAxis}
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => value === 'currentMonth' ? currentMonth : previousMonth}
          />
          <Bar 
            dataKey="previousMonth" 
            fill="#94A3B8" 
            name="previousMonth"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="currentMonth" 
            fill="#3B82F6" 
            name="currentMonth"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}