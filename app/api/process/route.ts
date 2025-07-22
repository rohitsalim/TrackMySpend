import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromPDF, preprocessPDFText } from '@/lib/utils/pdf-extractor'
import { parsePDFStatement } from '@/lib/ai/pdf-parser'
import { generateFingerprintsForTransactions, detectDuplicateTransactions, detectInternalTransfers } from '@/lib/utils/fingerprint'
import { addAmounts } from '@/lib/utils/financial'
import { processRequestSchema } from '@/types/api'
import { TransactionProcessor } from '@/lib/services/transaction-processor'

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
      console.log('Cleaned text length:', cleanedText.length)
      console.log('Cleaned text content (first 500 chars):', cleanedText.substring(0, 500))
      
      // Parse statement with LLM
      console.log('Starting LLM parsing...')
      const parsingResult = await parsePDFStatement(cleanedText)
      console.log('LLM parsing result:', parsingResult.success, parsingResult.statement?.transactions?.length || 0, 'transactions')
      
      if (!parsingResult.success || !parsingResult.statement) {
        throw new Error(parsingResult.error?.message || 'Failed to parse statement')
      }
      
      const statement = parsingResult.statement
      
      // Debug: Log the first few transactions
      console.log(`Statement details:`)
      console.log(`- Type: ${statement.statement_type}`)
      console.log(`- Bank: ${statement.bank_name}`)
      console.log(`- Transactions: ${statement.transactions.length}`)
      if (statement.transactions.length > 0) {
        console.log(`- First transaction:`, JSON.stringify(statement.transactions[0], null, 2))
      }
      
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
        amount: Number(transaction.amount),
        type: transaction.type,
        original_currency: transaction.original_currency || 'INR',
        original_amount: transaction.original_amount ? Number(transaction.original_amount) : null,
        fingerprint: transaction.fingerprint,
        parsing_confidence: (parsingResult.parsing_confidence || 0) / 100
      }))
      
      // Insert raw transactions (handling potential duplicates)
      const insertResults = await Promise.allSettled(
        rawTransactionsToInsert.map(async (transaction, index) => {
          const { error } = await supabase
            .from('raw_transactions')
            .insert(transaction)
          
          if (error && error.code === '23505') {
            // Duplicate fingerprint - this is expected for duplicates
            console.log(`Transaction ${index} is duplicate:`, error.message)
            return { success: true, duplicate: true }
          } else if (error) {
            console.error(`Transaction ${index} insertion error:`, error)
            console.error(`Failed transaction data:`, JSON.stringify(transaction, null, 2))
            throw error
          }
          
          console.log(`Transaction ${index} inserted successfully`)
          return { success: true, duplicate: false }
        })
      )
      
      // Count successful inserts
      const successfulInserts = insertResults.filter(
        result => result.status === 'fulfilled' && result.value.success
      ).length
      
      console.log(`Raw transaction insertion: ${successfulInserts}/${rawTransactionsToInsert.length} successful`)
      
      // Log any failed insertions
      const failedInserts = insertResults.filter(
        result => result.status === 'rejected'
      )
      if (failedInserts.length > 0) {
        console.error(`${failedInserts.length} raw transaction insertions failed:`)
        failedInserts.forEach((result, index) => {
          console.error(`Failed insert ${index}:`, result.reason)
        })
      }
      
      // Calculate totals using safe financial arithmetic
      const totalIncome = statement.transactions
        .filter(tx => tx.type === 'CREDIT')
        .reduce((sum, tx) => addAmounts(sum, tx.amount), '0.00')
      
      const totalExpenses = statement.transactions
        .filter(tx => tx.type === 'DEBIT')
        .reduce((sum, tx) => addAmounts(sum, tx.amount), '0.00')
      
      // Process raw transactions to create final transaction records
      const processor = new TransactionProcessor(supabase)
      const processingResult = await processor.processRawTransactions(fileId, user.id)
      console.log(`Transaction processor results: ${processingResult.processed} processed, ${processingResult.duplicates} duplicates, ${processingResult.internalTransfers} internal transfers`)
      
      // Also detect internal transfers across all user transactions
      await processor.detectAndLinkInternalTransfers(user.id)
      
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
            processed_transactions: processingResult.processed,
            duplicates_found: processingResult.duplicates,
            internal_transfers: processingResult.internalTransfers,
            parsing_confidence: (parsingResult.parsing_confidence || 0) / 100,
            total_income: totalIncome,
            total_expenses: totalExpenses,
            processing_errors: processingResult.errors
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