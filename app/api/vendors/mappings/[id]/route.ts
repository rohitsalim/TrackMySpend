import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { 
  VendorMapping,
  VendorAPIResponse
} from '@/types/vendor-resolution'

// Update validation schema
const updateMappingSchema = z.object({
  mapped_name: z.string().min(1).max(200).optional(),
  confidence: z.number().min(0).max(1).optional(),
  source: z.enum(['llm', 'user', 'google']).optional()
})

/**
 * PATCH /api/vendors/mappings/[id]
 * 
 * Update an existing vendor mapping (user can only update their own)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Validate mapping ID
    const resolvedParams = await params
    const mappingId = resolvedParams.id
    if (!mappingId || !z.string().uuid().safeParse(mappingId).success) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid mapping ID'
        }
      }, { status: 400 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedUpdates = updateMappingSchema.parse(body)

    // Check if mapping exists and user has permission to update
    const { data: existingMapping, error: checkError } = await supabase
      .from('vendor_mappings')
      .select('*')
      .eq('id', mappingId)
      .single()

    if (checkError || !existingMapping) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'MAPPING_NOT_FOUND',
          message: 'Vendor mapping not found'
        }
      }, { status: 404 })
    }

    // Users can only update their own mappings or global mappings they created
    if (existingMapping.user_id && existingMapping.user_id !== user.id) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own vendor mappings'
        }
      }, { status: 403 })
    }

    // Update the mapping
    const { data: updatedMapping, error: updateError } = await supabase
      .from('vendor_mappings')
      .update(validatedUpdates)
      .eq('id', mappingId)
      .select()
      .single()

    if (updateError) {
      console.error('Vendor mapping update error:', updateError)
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update vendor mapping'
        }
      }, { status: 400 })
    }

    return NextResponse.json<VendorAPIResponse<VendorMapping>>({
      success: true,
      data: updatedMapping
    })

  } catch (error) {
    console.error('Vendor mapping PATCH error:', error)
    
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

/**
 * DELETE /api/vendors/mappings/[id]
 * 
 * Delete a vendor mapping (user can only delete their own)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Validate mapping ID
    const resolvedParams = await params
    const mappingId = resolvedParams.id
    if (!mappingId || !z.string().uuid().safeParse(mappingId).success) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid mapping ID'
        }
      }, { status: 400 })
    }

    // Check if mapping exists and user has permission to delete
    const { data: existingMapping, error: checkError } = await supabase
      .from('vendor_mappings')
      .select('user_id')
      .eq('id', mappingId)
      .single()

    if (checkError || !existingMapping) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'MAPPING_NOT_FOUND',
          message: 'Vendor mapping not found'
        }
      }, { status: 404 })
    }

    // Users can only delete their own mappings
    if (existingMapping.user_id !== user.id) {
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own vendor mappings'
        }
      }, { status: 403 })
    }

    // Delete the mapping
    const { error: deleteError } = await supabase
      .from('vendor_mappings')
      .delete()
      .eq('id', mappingId)

    if (deleteError) {
      console.error('Vendor mapping delete error:', deleteError)
      return NextResponse.json<VendorAPIResponse<null>>({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete vendor mapping'
        }
      }, { status: 400 })
    }

    return NextResponse.json<VendorAPIResponse<{ deleted: true }>>({
      success: true,
      data: { deleted: true }
    })

  } catch (error) {
    console.error('Vendor mapping DELETE error:', error)
    return NextResponse.json<VendorAPIResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    }, { status: 500 })
  }
}