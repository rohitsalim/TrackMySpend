import { NextRequest, NextResponse } from 'next/server'
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getFinancialSummary, getCategoryBreakdown, getMonthlyData } from '@/lib/utils/dashboard-data'
import { formatCurrency } from '@/lib/utils/formatters'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const { transactions, categories } = body

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // Analyze financial data
    const summary = getFinancialSummary(transactions)
    const categoryBreakdown = getCategoryBreakdown(transactions, categories || [])
    const monthlyData = getMonthlyData(transactions)
    
    // Get latest month data
    const latestMonth = monthlyData[monthlyData.length - 1]
    const previousMonth = monthlyData[monthlyData.length - 2]
    
    // Calculate trends
    const expenseTrend = previousMonth 
      ? ((latestMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100
      : 0
    
    // Find top spending categories
    const topCategories = categoryBreakdown.slice(0, 3)
    
    // Create context for AI
    const context = `
    Financial Summary:
    - Total Income: ${formatCurrency(summary.totalIncome)}
    - Total Expenses: ${formatCurrency(summary.totalExpenses)}
    - Net Balance: ${formatCurrency(summary.netBalance)}
    - Transaction Count: ${summary.transactionCount}
    
    Latest Month (${latestMonth?.monthName || 'Current'}):
    - Income: ${formatCurrency(latestMonth?.income || 0)}
    - Expenses: ${formatCurrency(latestMonth?.expenses || 0)}
    - Expense Change: ${expenseTrend > 0 ? '+' : ''}${expenseTrend.toFixed(1)}%
    
    Top Spending Categories:
    ${topCategories.map(cat => `- ${cat.categoryName}: ${formatCurrency(cat.amount)} (${cat.percentage.toFixed(1)}%)`).join('\n')}
    
    Monthly Trend: ${monthlyData.length} months of data available
    Average Monthly Expenses: ${formatCurrency(summary.totalExpenses / monthlyData.length)}
    `

    // Generate insights using Gemini
    const { text } = await generateText({
      model: google('gemini-2.5-pro'),
      temperature: 0.7,
      prompt: `You are a helpful financial advisor. Based on the following financial data, provide 3-4 concise, actionable insights to help the user improve their financial health. Focus on spending patterns, savings opportunities, and practical recommendations.

${context}

Format your response as a JSON array of insight objects, each with:
- type: "positive" | "negative" | "warning" | "neutral"
- title: Brief title (max 10 words)
- description: Detailed insight (max 50 words)
- icon: "trending-up" | "trending-down" | "alert-circle" | "info"

Example format:
[
  {
    "type": "warning",
    "title": "High Food Spending",
    "description": "Your dining expenses increased 25% this month. Consider meal planning to reduce costs.",
    "icon": "alert-circle"
  }
]

Respond with only the JSON array, no additional text.`
    })

    // Parse the AI response
    let insights
    try {
      insights = JSON.parse(text)
      // Validate the structure
      if (!Array.isArray(insights)) {
        throw new Error('Invalid insights format')
      }
    } catch {
      // Fallback to default insights if parsing fails
      insights = [
        {
          type: summary.netBalance > 0 ? 'positive' : 'warning',
          title: summary.netBalance > 0 ? 'Positive Cash Flow' : 'Negative Cash Flow',
          description: summary.netBalance > 0 
            ? `You saved ${formatCurrency(summary.netBalance)} this period. Great job!`
            : `You overspent by ${formatCurrency(Math.abs(summary.netBalance))}. Consider reducing expenses.`,
          icon: summary.netBalance > 0 ? 'trending-up' : 'trending-down'
        },
        {
          type: 'neutral',
          title: 'Top Spending Category',
          description: topCategories[0] 
            ? `${topCategories[0].categoryName} accounts for ${topCategories[0].percentage.toFixed(1)}% of your expenses.`
            : 'Categorize your transactions to get better insights.',
          icon: 'info'
        }
      ]
    }

    return NextResponse.json({
      insights,
      summary: {
        totalIncome: summary.totalIncome,
        totalExpenses: summary.totalExpenses,
        netBalance: summary.netBalance,
        expenseTrend
      }
    })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}