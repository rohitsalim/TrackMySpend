import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    
    // Get form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (files.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NO_FILES', 
            message: 'No files provided' 
          } 
        },
        { status: 400 }
      )
    }
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type === 'application/pdf'
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB
      return isValidType && isValidSize
    })
    
    if (validFiles.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_FILES', 
            message: 'No valid PDF files found (max 10MB)' 
          } 
        },
        { status: 400 }
      )
    }
    
    // Upload files
    const uploadResults = await Promise.all(
      validFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}_${file.name}`
        
        // Convert File to ArrayBuffer then to Uint8Array
        const arrayBuffer = await file.arrayBuffer()
        const fileData = new Uint8Array(arrayBuffer)
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('statements')
          .upload(fileName, fileData, {
            contentType: file.type,
            upsert: false
          })
        
        if (uploadError) {
          console.error('Upload error:', uploadError)
          return { success: false, error: uploadError.message }
        }
        
        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase.storage
          .from('statements')
          .getPublicUrl(uploadData.path)
        
        // Create file record in database
        const { data: fileRecord, error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: user.id,
            filename: file.name,
            file_url: publicUrl,
            file_type: fileExt || 'pdf',
            status: 'pending'
          })
          .select()
          .single()
        
        if (dbError) {
          console.error('Database error:', dbError)
          // Try to clean up uploaded file
          await supabase.storage.from('statements').remove([uploadData.path])
          return { success: false, error: dbError.message }
        }
        
        return { success: true, file: fileRecord }
      })
    )
    
    // Check results
    const successfulUploads = uploadResults.filter(r => r.success)
    const failedUploads = uploadResults.filter(r => !r.success)
    
    if (successfulUploads.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'UPLOAD_FAILED', 
            message: 'All file uploads failed' 
          } 
        },
        { status: 500 }
      )
    }
    
    // TODO: Trigger processing for uploaded files
    
    return NextResponse.json({
      success: true,
      data: {
        uploaded: successfulUploads.map(r => r.file),
        failed: failedUploads.length,
        total: files.length
      }
    })
    
  } catch (error) {
    console.error('Upload API error:', error)
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