import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { TransactionCategorizer } from '@/lib/services/transaction-categorizer'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']

// Request validation schema
const bulkResolveCategorySchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1, 'At least one transaction ID required').max(50, 'Too many transactions'),
  autoApply: z.boolean().default(false)
})

interface CategoryResolutionResult {
  transactionId: string
  vendorName: string
  originalCategory: string | null
  suggestedCategory: {
    categoryId: string
    categoryName: string
    confidence: number
    source: 'csv' | 'pattern' | 'user'
    reasoning?: string
  } | null
  applied: boolean
  error?: string
}

/**
 * POST /api/categories/bulk-resolve
 * 
 * Resolve categories for multiple transactions in bulk
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const { transactionIds, autoApply } = bulkResolveCategorySchema.parse(body)

    // Fetch transactions
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id,
        vendor_name,
        vendor_name_original,
        amount,
        type,
        transaction_date,
        category_id,
        categories (
          id,
          name
        )
      `)
      .in('id', transactionIds)
      .eq('user_id', user.id)

    if (fetchError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch transactions'
        }
      }, { status: 400 })
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_TRANSACTIONS',
          message: 'No transactions found for the provided IDs'
        }
      }, { status: 404 })
    }

    // Initialize categorizer
    const categorizer = new TransactionCategorizer(supabase)
    const results: CategoryResolutionResult[] = []
    const updates: Array<{ id: string; category_id: string }> = []

    // Process each transaction
    for (const transaction of transactions) {
      try {
        const result = await categorizer.categorizeTransaction({
          transactionId: transaction.id,
          vendorName: transaction.vendor_name,
          amount: Number(transaction.amount),
          transactionType: transaction.type,
          transactionDate: transaction.transaction_date,
          userId: user.id
        })

        const categoryName = Array.isArray(transaction.categories) 
          ? null 
          : (transaction.categories as { name: string } | null)?.name || null
        
        const resultEntry: CategoryResolutionResult = {
          transactionId: transaction.id,
          vendorName: transaction.vendor_name,
          originalCategory: categoryName,
          suggestedCategory: result.success ? result.data || null : null,
          applied: false
        }

        if (result.success && result.data) {
          // Determine if we should auto-apply
          const shouldApply = autoApply && 
                             result.data.confidence >= 0.8 && 
                             transaction.category_id !== result.data.categoryId

          if (shouldApply) {
            updates.push({
              id: transaction.id,
              category_id: result.data.categoryId
            })
            resultEntry.applied = true
          }
        } else {
          resultEntry.error = result.error?.message || 'Failed to categorize'
        }

        results.push(resultEntry)

      } catch (error) {
        const categoryName = Array.isArray(transaction.categories) 
          ? null 
          : (transaction.categories as { name: string } | null)?.name || null

        results.push({
          transactionId: transaction.id,
          vendorName: transaction.vendor_name,
          originalCategory: categoryName,
          suggestedCategory: null,
          applied: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Apply updates if auto-apply is enabled
    if (updates.length > 0) {
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ 
            category_id: update.category_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
          .eq('user_id', user.id)

        if (updateError) {
          console.error(`Failed to update transaction ${update.id}:`, updateError)
          // Find the result and mark as not applied
          const resultIndex = results.findIndex(r => r.transactionId === update.id)
          if (resultIndex >= 0) {
            results[resultIndex].applied = false
            results[resultIndex].error = 'Failed to apply category update'
          }
        }
      }
    }

    // Calculate statistics
    const stats = {
      total: results.length,
      categorized: results.filter(r => r.suggestedCategory).length,
      applied: results.filter(r => r.applied).length,
      failed: results.filter(r => r.error).length,
      high_confidence: results.filter(r => r.suggestedCategory && r.suggestedCategory.confidence >= 0.8).length
    }

    // Log bulk categorization
    console.log('Bulk category resolution:', {
      user_id: user.id,
      transaction_count: results.length,
      auto_apply: autoApply,
      stats,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: {
        results,
        stats
      },
      meta: {
        auto_apply_enabled: autoApply,
        confidence_threshold: 0.8,
        applied_count: stats.applied
      }
    })

  } catch (error) {
    console.error('Bulk category resolution API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors.reduce((acc, err) => {
            acc[err.path.join('.')] = err.message
            return acc
          }, {} as Record<string, string>)
        }
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}