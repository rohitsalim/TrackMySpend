import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { VendorResolver } from '@/lib/ai/vendor-resolver'
import type { 
  VendorResolutionRequest,
  VendorAPIResponse,
  VendorResolutionResponse
} from '@/types/vendor-resolution'

// Request validation schema (following .cursorrules)
const resolveVendorSchema = z.object({
  original_text: z.string().min(1, 'Vendor text is required').max(500, 'Vendor text too long'),
  transaction_id: z.string().uuid().optional(),
  context: z.object({
    amount: z.string().optional(),
    date: z.string().optional(),
    bank_name: z.string().optional()
  }).optional()
})

/**
 * POST /api/vendors/resolve
 * 
 * Resolve a single vendor name using AI with optional context
 * Implements caching and intelligent vendor mapping
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate authentication (following .cursorrules security)
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
    const validatedRequest = resolveVendorSchema.parse(body) as VendorResolutionRequest

    // Initialize vendor resolver
    const vendorResolver = new VendorResolver(supabase)
    
    // Resolve vendor with user context
    const result = await vendorResolver.resolveVendor(validatedRequest, user.id)
    
    if (!result.success) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: result.error?.code || 'RESOLUTION_FAILED',
          message: result.error?.message || 'Vendor resolution failed'
        }
      }, { status: 400 })
    }

    // Log vendor resolution for monitoring (following .cursorrules - no sensitive data)
    console.log('Vendor resolved:', {
      user_id: user.id,
      original_length: validatedRequest.original_text.length,
      confidence: result.data?.confidence,
      source: result.data?.source,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json<VendorAPIResponse<VendorResolutionResponse['data']>>({
      success: true,
      data: result.data!,
      meta: {
        resolved_count: 1,
        cache_hit_rate: result.data?.source === 'user' ? 1.0 : 0.0
      }
    })

  } catch (error) {
    console.error('Vendor resolution API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json<VendorAPIResponse<null>>({
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

    return NextResponse.json<VendorAPIResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}