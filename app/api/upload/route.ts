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
    
    // Trigger processing for uploaded files
    const processingResults = await Promise.all(
      successfulUploads.map(async (uploadResult) => {
        try {
          // Update status to processing
          await supabase
            .from('files')
            .update({ status: 'processing' })
            .eq('id', uploadResult.file.id)

          // Call processing API with forwarded cookies
          const processResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/process`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': request.headers.get('cookie') || '',
            },
            body: JSON.stringify({ fileId: uploadResult.file.id }),
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
            console.error('Processing failed:', processResult.error)
            
            // Update status to failed
            await supabase
              .from('files')
              .update({ status: 'failed' })
              .eq('id', uploadResult.file.id)
            
            // Clean up the uploaded file from storage since processing failed
            try {
              const urlPath = uploadResult.file.file_url.replace(/.*\/storage\/v1\/object\/public\/statements\//, '')
              const { error: storageError } = await supabase.storage
                .from('statements')
                .remove([urlPath])
              
              if (storageError) {
                console.error('Failed to cleanup file from storage:', storageError)
              }
            } catch (cleanupError) {
              console.error('Failed to cleanup file from storage:', cleanupError)
            }
            
            // Remove the file record from database
            try {
              const { error: dbError } = await supabase
                .from('files')
                .delete()
                .eq('id', uploadResult.file.id)
              
              if (dbError) {
                console.error('Failed to cleanup file record:', dbError)
              }
            } catch (dbError) {
              console.error('Failed to cleanup file record:', dbError)
            }
            
            return {
              fileId: uploadResult.file.id,
              success: false,
              error: processResult.error?.message || 'Processing failed'
            }
          }

          return {
            fileId: uploadResult.file.id,
            success: true,
            processing: processResult.data
          }
        } catch (error) {
          console.error('Processing error:', error)
          
          // Update status to failed
          await supabase
            .from('files')
            .update({ status: 'failed' })
            .eq('id', uploadResult.file.id)
          
          // Clean up the uploaded file from storage since processing failed
          try {
            const urlPath = uploadResult.file.file_url.replace(/.*\/storage\/v1\/object\/public\/statements\//, '')
            const { error: storageError } = await supabase.storage
              .from('statements')
              .remove([urlPath])
            
            if (storageError) {
              console.error('Failed to cleanup file from storage:', storageError)
            }
          } catch (cleanupError) {
            console.error('Failed to cleanup file from storage:', cleanupError)
          }
          
          // Remove the file record from database
          try {
            const { error: dbError } = await supabase
              .from('files')
              .delete()
              .eq('id', uploadResult.file.id)
            
            if (dbError) {
              console.error('Failed to cleanup file record:', dbError)
            }
          } catch (dbError) {
            console.error('Failed to cleanup file record:', dbError)
          }
          
          return {
            fileId: uploadResult.file.id,
            success: false,
            error: error instanceof Error ? error.message : 'Processing failed'
          }
        }
      })
    )

    const successfulProcessing = processingResults.filter(r => r.success)
    const failedProcessing = processingResults.filter(r => !r.success)
    
    return NextResponse.json({
      success: true,
      data: {
        uploaded: successfulUploads.map(r => r.file),
        processing: {
          successful: successfulProcessing.length,
          failed: failedProcessing.length,
          errors: failedProcessing.map(p => ({ fileId: p.fileId, error: p.error }))
        },
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