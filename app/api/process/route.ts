import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromPDF, preprocessPDFText } from '@/lib/utils/pdf-extractor'
import { parsePDFStatement } from '@/lib/ai/pdf-parser'
import { generateFingerprintsForTransactions, detectDuplicateTransactions, detectInternalTransfers } from '@/lib/utils/fingerprint'
import { addAmounts } from '@/lib/utils/financial'
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
    
    // Get file record from database
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
    
    // Update file status to processing
    await supabase
      .from('files')
      .update({ status: 'processing' })
      .eq('id', fileId)
    
    try {
      // Extract file path from URL for storage access
      const urlPath = fileRecord.file_url.replace(/.*\/storage\/v1\/object\/public\/statements\//, '')
      
      // Download file from Supabase storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('statements')
        .download(urlPath)
      
      if (downloadError || !fileData) {
        throw new Error('Failed to download file from storage')
      }
      
      // Convert to buffer
      const fileBuffer = Buffer.from(await fileData.arrayBuffer())
      
      // Extract text from PDF
      const extractionResult = await extractTextFromPDF(fileBuffer)
      
      if (!extractionResult.success) {
        throw new Error(extractionResult.error?.message || 'Failed to extract text from PDF')
      }
      
      // Preprocess extracted text
      const cleanedText = preprocessPDFText(extractionResult.text!)
      
      // Parse statement with LLM
      const parsingResult = await parsePDFStatement(cleanedText)
      
      if (!parsingResult.success || !parsingResult.statement) {
        throw new Error(parsingResult.error?.message || 'Failed to parse statement')
      }
      
      const statement = parsingResult.statement
      
      // Generate fingerprints for deduplication
      const transactionsWithFingerprints = generateFingerprintsForTransactions(
        statement.transactions,
        user.id
      )
      
      // Detect duplicates and internal transfers
      const { unique, duplicates } = detectDuplicateTransactions(transactionsWithFingerprints)
      const processedTransactions = detectInternalTransfers([...unique, ...duplicates])
      
      // Store raw transactions in database
      const rawTransactionsToInsert = processedTransactions.map(transaction => ({
        file_id: fileId,
        user_id: user.id,
        date: transaction.date,
        description: transaction.description,
        reference_number: transaction.reference_number || null,
        raw_text: transaction.raw_text,
        amount: Number(transaction.amount).toFixed(2),
        type: transaction.type,
        original_currency: transaction.original_currency || 'INR',
        original_amount: transaction.original_amount ? Number(transaction.original_amount).toFixed(2) : null,
        fingerprint: transaction.fingerprint,
        parsing_confidence: parsingResult.parsing_confidence || 0
      }))
      
      // Insert raw transactions (handling potential duplicates)
      const insertResults = await Promise.allSettled(
        rawTransactionsToInsert.map(async (transaction) => {
          const { error } = await supabase
            .from('raw_transactions')
            .insert(transaction)
          
          if (error && error.code === '23505') {
            // Duplicate fingerprint - this is expected for duplicates
            return { success: true, duplicate: true }
          } else if (error) {
            throw error
          }
          
          return { success: true, duplicate: false }
        })
      )
      
      // Count successful inserts
      const successfulInserts = insertResults.filter(
        result => result.status === 'fulfilled' && result.value.success
      ).length
      
      // Calculate totals using safe financial arithmetic
      const totalIncome = statement.transactions
        .filter(tx => tx.type === 'CREDIT')
        .reduce((sum, tx) => addAmounts(sum, tx.amount), '0.00')
      
      const totalExpenses = statement.transactions
        .filter(tx => tx.type === 'DEBIT')
        .reduce((sum, tx) => addAmounts(sum, tx.amount), '0.00')
      
      // Update file record with processing results
      await supabase
        .from('files')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          total_transactions: successfulInserts,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          person_inferred: null // TODO: Implement person inference for family accounts
        })
        .eq('id', fileId)
      
      return NextResponse.json({
        success: true,
        data: {
          fileId,
          statement: {
            type: statement.statement_type,
            bank_name: statement.bank_name,
            statement_period: {
              start: statement.statement_start_date,
              end: statement.statement_end_date
            }
          },
          processing_results: {
            total_transactions: statement.transactions.length,
            stored_transactions: successfulInserts,
            duplicates_found: duplicates.length,
            internal_transfers: processedTransactions.filter(tx => tx.is_internal_transfer).length,
            parsing_confidence: parsingResult.parsing_confidence || 0,
            total_income: totalIncome,
            total_expenses: totalExpenses
          }
        }
      })
      
    } catch (processingError) {
      console.error('Processing error:', processingError)
      
      // Update file status to failed
      await supabase
        .from('files')
        .update({ 
          status: 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('id', fileId)
      
      throw processingError
    }
    
  } catch (error) {
    console.error('Process API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'PROCESSING_ERROR', 
          message: error instanceof Error ? error.message : 'Internal processing error' 
        } 
      },
      { status: 500 }
    )
  }
}