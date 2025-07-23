import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { 
  VendorMapping,
  VendorMappingInsert,
  VendorAPIResponse
} from '@/types/vendor-resolution'

// Request validation schemas
const createMappingSchema = z.object({
  original_text: z.string().min(1).max(500),
  mapped_name: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
  source: z.enum(['llm', 'user', 'google'])
})

// Note: updateMappingSchema is in [id]/route.ts file

/**
 * GET /api/vendors/mappings
 * 
 * Retrieve vendor mappings with pagination and filtering
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 per page
    const search = searchParams.get('search') || ''
    const source = searchParams.get('source') || ''
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('vendor_mappings')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${user.id},user_id.is.null`) // User's mappings + global mappings
      .order('confidence', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (search) {
      query = query.or(`original_text.ilike.%${search}%,mapped_name.ilike.%${search}%`)
    }
    if (source) {
      query = query.eq('source', source)
    }

    const { data: mappings, error, count } = await query

    if (error) {
      console.error('Vendor mappings query error:', error)
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: 'Failed to retrieve vendor mappings'
        }
      }, { status: 400 })
    }

    return NextResponse.json<VendorAPIResponse<VendorMapping[]>>({
      success: true,
      data: mappings || [],
      meta: {
        total_count: count || 0,
        cache_hit_rate: undefined // Not applicable for this endpoint
      }
    })

  } catch (error) {
    console.error('Vendor mappings GET error:', error)
    return NextResponse.json<VendorAPIResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}

/**
 * POST /api/vendors/mappings
 * 
 * Create a new vendor mapping (user override)
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
    const validatedData = createMappingSchema.parse(body)

    // Check if mapping already exists
    const { data: existing, error: checkError } = await supabase
      .from('vendor_mappings')
      .select('id')
      .eq('original_text', validatedData.original_text)
      .eq('user_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'QUERY_ERROR',
          message: 'Failed to check existing mapping'
        }
      }, { status: 400 })
    }

    if (existing) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'MAPPING_EXISTS',
          message: 'Vendor mapping already exists for this text'
        }
      }, { status: 409 })
    }

    // Create new mapping
    const newMapping: VendorMappingInsert = {
      ...validatedData,
      user_id: user.id, // User-specific mapping
      source: 'user' as const // Force user override source
    }

    const { data: mapping, error: insertError } = await supabase
      .from('vendor_mappings')
      .insert(newMapping)
      .select()
      .single()

    if (insertError) {
      console.error('Vendor mapping insert error:', insertError)
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'INSERT_ERROR',
          message: 'Failed to create vendor mapping'
        }
      }, { status: 400 })
    }

    return NextResponse.json<VendorAPIResponse<VendorMapping>>({
      success: true,
      data: mapping
    }, { status: 201 })

  } catch (error) {
    console.error('Vendor mappings POST error:', error)
    
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