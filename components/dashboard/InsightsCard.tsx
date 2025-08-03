'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  Sparkles 
} from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { generateInsightsHash } from '@/lib/utils/insights-cache'
import type { Database } from '@/types/database'
import type { Insight } from '@/lib/utils/insights-cache'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface InsightsCardProps {
  transactions: Transaction[]
  categories: Category[]
}

const iconMap = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'alert-circle': AlertCircle,
  'info': Info,
}

const typeStyles = {
  positive: 'bg-green-50 text-green-700 border-green-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  neutral: 'bg-blue-50 text-blue-700 border-blue-200',
}

export function InsightsCard({ transactions, categories }: InsightsCardProps) {
  const {
    getCachedInsights,
    setCachedInsights,
    shouldRefreshInsights,
    loadInsightsCacheFromStorage
  } = useTransactionStore()
  
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Load cache from localStorage on component mount
  useEffect(() => {
    if (!hasInitialized) {
      loadInsightsCacheFromStorage()
      setHasInitialized(true)
    }
  }, [loadInsightsCacheFromStorage, hasInitialized])

  const generateInsights = useCallback(async () => {
    if (transactions.length === 0) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactions, categories }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate insights')
      }

      const data = await response.json()
      const newInsights = data.insights
      
      // Update state
      setInsights(newInsights)
      
      // Cache the insights with current data hash
      const currentHash = generateInsightsHash(transactions, categories)
      setCachedInsights(newInsights, currentHash)
      
    } catch (error) {
      console.error('Error generating insights:', error)
      // Set default insights on error
      const errorInsights = [
        {
          type: 'neutral' as const,
          title: 'Insights Unavailable',
          description: 'Unable to generate insights at this time. Please try again later.',
          icon: 'info' as const
        }
      ]
      setInsights(errorInsights)
    } finally {
      setLoading(false)
    }
  }, [transactions, categories, setCachedInsights])

  // Check cache and load insights
  useEffect(() => {
    const loadInsights = async () => {
      if (!hasInitialized || transactions.length === 0) return
      
      const cachedInsights = getCachedInsights()
      const needsRefresh = shouldRefreshInsights()
      
      if (cachedInsights && !needsRefresh) {
        // Use cached insights
        setInsights(cachedInsights)
      } else if (!loading) {
        // Generate fresh insights
        await generateInsights()
      }
    }
    
    loadInsights()
  }, [transactions, categories, hasInitialized, getCachedInsights, shouldRefreshInsights, loading, generateInsights])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Financial Insights
        </CardTitle>
        <Button
          onClick={() => generateInsights()}
          variant="ghost"
          size="sm"
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const Icon = iconMap[insight.icon]
              return (
                <div
                  key={index}
                  className={`flex gap-3 p-3 rounded-lg border ${typeStyles[insight.type]}`}
                >
                  <div className="flex-shrink-0">
                    <div className="p-2 rounded-lg bg-background/50">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
                    <p className="text-xs opacity-90">{insight.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click refresh to generate insights</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}