import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { VendorResolver } from '@/lib/ai/vendor-resolver'
import type { 
  BulkVendorResolutionRequest,
  BulkVendorResolutionResponse,
  VendorAPIResponse
} from '@/types/vendor-resolution'

// Request validation schema for bulk resolution
const bulkResolveVendorSchema = z.object({
  vendor_texts: z.array(
    z.object({
      original_text: z.string().min(1).max(500),
      transaction_id: z.string().uuid().optional(),
      context: z.object({
        amount: z.string().optional(),
        date: z.string().optional(),
        bank_name: z.string().optional()
      }).optional()
    })
  ).min(1, 'At least one vendor text required').max(100, 'Maximum 100 vendors per batch')
})

/**
 * POST /api/vendors/bulk-resolve
 * 
 * Resolve multiple vendor names in batch for efficiency
 * Implements intelligent batching with progress tracking
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedRequest = bulkResolveVendorSchema.parse(body) as BulkVendorResolutionRequest

    // Initialize vendor resolver
    const vendorResolver = new VendorResolver(supabase)
    
    // Process bulk resolution with user context
    const result = await vendorResolver.bulkResolveVendors(validatedRequest.vendor_texts, user.id)
    
    if (!result.success) {
      return NextResponse.json<BulkVendorResolutionResponse>({
        success: false,
        error: {
          code: 'BULK_RESOLUTION_FAILED',
          message: 'Bulk vendor resolution failed'
        }
      }, { status: 400 })
    }

    // Log bulk resolution stats (following .cursorrules - no sensitive data)
    console.log('Bulk vendor resolution completed:', {
      user_id: user.id,
      total_count: result.data?.stats.total,
      resolved_count: result.data?.stats.resolved,
      failed_count: result.data?.stats.failed,
      cache_hit_rate: result.meta?.cache_hit_rate,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json<BulkVendorResolutionResponse>({
      success: true,
      data: result.data!
    })

  } catch (error) {
    console.error('Bulk vendor resolution API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json<BulkVendorResolutionResponse>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data'
        }
      }, { status: 400 })
    }

    return NextResponse.json<BulkVendorResolutionResponse>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}