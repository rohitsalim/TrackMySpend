import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { TransactionCategorizer } from '@/lib/services/transaction-categorizer'

// Request validation schema
const resolveCategorySchema = z.object({
  transactionId: z.string().uuid(),
  vendorName: z.string().min(1, 'Vendor name is required').max(500, 'Vendor name too long'),
  amount: z.number().positive('Amount must be positive'),
  transactionType: z.enum(['DEBIT', 'CREDIT']),
  description: z.string().optional(),
  transactionDate: z.string().optional()
})

/**
 * POST /api/categories/resolve
 * 
 * Resolve category for a single transaction using AI and pattern matching
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
    const validatedRequest = resolveCategorySchema.parse(body)

    // Initialize transaction categorizer
    const categorizer = new TransactionCategorizer(supabase)
    
    // Categorize transaction
    const result = await categorizer.categorizeTransaction({
      ...validatedRequest,
      userId: user.id
    })
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: result.error?.code || 'CATEGORIZATION_FAILED',
          message: result.error?.message || 'Category resolution failed'
        }
      }, { status: 400 })
    }

    // Update the transaction with the suggested category
    if (result.data && result.data.confidence >= 0.8) {
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ 
          category_id: result.data.categoryId,
          updated_at: new Date().toISOString()
        })
        .eq('id', validatedRequest.transactionId)
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Failed to update transaction category:', updateError)
      }
    }

    // Log categorization for monitoring
    console.log('Category resolved:', {
      user_id: user.id,
      vendor_name: validatedRequest.vendorName,
      category: result.data?.categoryName,
      confidence: result.data?.confidence,
      source: result.data?.source,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        auto_applied: (result.data?.confidence ?? 0) >= 0.8,
        confidence_threshold: 0.8
      }
    })

  } catch (error) {
    console.error('Category resolution API error:', error)
    
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