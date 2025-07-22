import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processRequestSchema } from '@/types/api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Validate user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'UNAUTHORIZED', 
            message: 'User not authenticated' 
          } 
        },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    
    // Validate request with Zod schema
    const validationResult = processRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: validationResult.error.errors
        }
      }, { status: 400 })
    }
    
    const { fileId } = validationResult.data
    
    // Get file record from database - check if it exists and belongs to user
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()
    
    if (fileError || !fileRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'FILE_NOT_FOUND', 
            message: 'File not found or access denied' 
          } 
        },
        { status: 404 }
      )
    }
    
    // Check if file is in failed state
    if (fileRecord.status !== 'failed') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_STATUS', 
            message: 'File is not in failed state and cannot be retried' 
          } 
        },
        { status: 400 }
      )
    }
    
    try {
      // Update status to processing
      await supabase
        .from('files')
        .update({ status: 'processing' })
        .eq('id', fileId)
      
      // Call processing API with forwarded cookies
      const processResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ fileId }),
      })
      
      const responseText = await processResponse.text()
      let processResult
      try {
        processResult = JSON.parse(responseText)
      } catch (jsonError) {
        console.error('Failed to parse process response as JSON:', jsonError)
        console.error('Response status:', processResponse.status)
        console.error('Response headers:', Object.fromEntries(processResponse.headers.entries()))
        console.error('Response was:', responseText)
        throw new Error(`Processing API returned invalid response: ${responseText.substring(0, 200)}...`)
      }
      
      if (!processResponse.ok || !processResult.success) {
        console.error('Retry processing failed:', processResult.error)
        
        // Update status back to failed
        await supabase
          .from('files')
          .update({ status: 'failed' })
          .eq('id', fileId)
        
        return NextResponse.json({
          success: false,
          error: {
            code: 'PROCESSING_FAILED',
            message: processResult.error?.message || 'Processing failed during retry'
          }
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        data: {
          fileId,
          processing: processResult.data
        }
      })
      
    } catch (error) {
      console.error('Retry processing error:', error)
      
      // Update status back to failed
      await supabase
        .from('files')
        .update({ status: 'failed' })
        .eq('id', fileId)
      
      return NextResponse.json({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Retry processing failed'
        }
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Retry API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'SERVER_ERROR', 
          message: error instanceof Error ? error.message : 'Internal server error' 
        } 
      },
      { status: 500 }
    )
  }
}