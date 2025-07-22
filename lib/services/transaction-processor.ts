import { createClient } from '@/lib/supabase/server'
import { detectDuplicateTransactions, detectInternalTransfers } from '@/lib/utils/fingerprint'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Insert']
type RawTransaction = Database['public']['Tables']['raw_transactions']['Row']

export class TransactionProcessor {
  private supabase: Awaited<ReturnType<typeof createClient>>

  constructor(supabaseClient: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabaseClient
  }

  async processRawTransactions(fileId: string, userId: string): Promise<{
    processed: number
    duplicates: number
    internalTransfers: number
    errors: string[]
  }> {
    try {
      // Fetch raw transactions for the file
      const { data: rawTransactions, error: fetchError } = await this.supabase
        .from('raw_transactions')
        .select('*')
        .eq('file_id', fileId)
        .eq('user_id', userId)
        .order('date', { ascending: false })

      if (fetchError) throw fetchError
      if (!rawTransactions || rawTransactions.length === 0) {
        return { processed: 0, duplicates: 0, internalTransfers: 0, errors: [] }
      }

      // Get existing transactions for duplicate detection
      const { data: existingTransactions, error: existingError } = await this.supabase
        .from('transactions')
        .select('raw_transaction_id, fingerprint:raw_transactions!inner(fingerprint)')
        .eq('user_id', userId)

      if (existingError) throw existingError

      const existingFingerprints = new Set(
        existingTransactions?.map((t) => {
          const fingerprint = (t as { fingerprint?: { fingerprint?: string } }).fingerprint?.fingerprint
          return fingerprint
        }).filter(Boolean) || []
      )

      // Prepare transactions with fingerprints - create a custom type that includes id
      interface TransactionWithId {
        date: string
        description: string
        reference_number: string
        raw_text: string
        amount: string
        type: 'DEBIT' | 'CREDIT'
        original_currency: string
        original_amount: string | null
        fingerprint: string
        id: string
      }
      
      const transactionsWithFingerprints: TransactionWithId[] = rawTransactions.map((rt: RawTransaction) => ({
        date: rt.date,
        description: rt.description,
        reference_number: rt.reference_number || '',
        raw_text: rt.raw_text,
        amount: rt.amount.toString(),
        type: rt.type as 'DEBIT' | 'CREDIT',
        original_currency: rt.original_currency,
        original_amount: rt.original_amount ? rt.original_amount.toString() : null,
        fingerprint: rt.fingerprint,
        id: rt.id
      }))

      // Detect duplicates within the new batch - cast to match expected type
      const transactionsForDuplication = transactionsWithFingerprints.map(tx => ({
        ...tx,
        reference_number: tx.reference_number,
        original_amount: tx.original_amount
      }))
      
      const { unique, duplicates } = detectDuplicateTransactions(transactionsForDuplication)

      // Filter out existing transactions and maintain id mapping
      const idMapping = new Map<string, string>()
      transactionsWithFingerprints.forEach(tx => {
        idMapping.set(tx.fingerprint, tx.id)
      })
      
      const newTransactions = unique.filter(
        tx => !existingFingerprints.has(tx.fingerprint)
      )

      // Detect internal transfers
      const processedTransactions = detectInternalTransfers(newTransactions)

      // Create transaction records
      const transactionsToInsert: Transaction[] = processedTransactions.map((tx) => {
        const rawId = idMapping.get(tx.fingerprint)
        if (!rawId) throw new Error(`Missing ID for transaction with fingerprint ${tx.fingerprint}`)
        
        return {
          user_id: userId,
          raw_transaction_id: rawId,
          vendor_name: tx.description, // Will be resolved in vendor resolution phase
          vendor_name_original: tx.description,
          amount: parseFloat(tx.amount),
          type: tx.type,
          transaction_date: tx.date,
          is_duplicate: false,
          is_internal_transfer: tx.is_internal_transfer || false,
          // TODO: Map related_transaction_id after insertion
        }
      })

      // Insert transactions in batches
      const batchSize = 100
      const errors: string[] = []
      let processed = 0

      for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
        const batch = transactionsToInsert.slice(i, i + batchSize)
        const { error: insertError } = await this.supabase
          .from('transactions')
          .insert(batch)

        if (insertError) {
          errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`)
        } else {
          processed += batch.length
        }
      }

      // Update file processing stats
      const { error: updateError } = await this.supabase
        .from('files')
        .update({
          total_transactions: rawTransactions.length,
          total_income: rawTransactions
            .filter((t) => t.type === 'CREDIT')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
          total_expenses: rawTransactions
            .filter((t) => t.type === 'DEBIT')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
          status: 'completed',
          processed_at: new Date().toISOString()
        })
        .eq('id', fileId)
        .eq('user_id', userId)

      if (updateError) {
        errors.push(`File update: ${updateError.message}`)
      }

      return {
        processed,
        duplicates: duplicates.length + (rawTransactions.length - newTransactions.length),
        internalTransfers: processedTransactions.filter(t => t.is_internal_transfer).length,
        errors
      }
    } catch (error) {
      return {
        processed: 0,
        duplicates: 0,
        internalTransfers: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  async detectAndLinkInternalTransfers(userId: string): Promise<{
    linked: number
    errors: string[]
  }> {
    try {
      // Get all transactions for the user
      const { data: transactions, error: fetchError } = await this.supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_internal_transfer', false)
        .order('transaction_date', { ascending: false })

      if (fetchError) throw fetchError
      if (!transactions || transactions.length === 0) {
        return { linked: 0, errors: [] }
      }

      let linked = 0
      const errors: string[] = []

      // Find potential internal transfers
      for (let i = 0; i < transactions.length; i++) {
        for (let j = i + 1; j < transactions.length; j++) {
          const tx1 = transactions[i]
          const tx2 = transactions[j]

          if (
            Math.abs(tx1.amount - tx2.amount) < 0.01 &&
            tx1.type !== tx2.type &&
            this.isWithinDays(tx1.transaction_date, tx2.transaction_date, 3) &&
            this.couldBeInternalTransfer(tx1.vendor_name, tx2.vendor_name)
          ) {
            // Link the transactions
            const { error: updateError1 } = await this.supabase
              .from('transactions')
              .update({
                is_internal_transfer: true,
                related_transaction_id: tx2.id
              })
              .eq('id', tx1.id)

            const { error: updateError2 } = await this.supabase
              .from('transactions')
              .update({
                is_internal_transfer: true,
                related_transaction_id: tx1.id
              })
              .eq('id', tx2.id)

            if (updateError1 || updateError2) {
              errors.push(`Failed to link ${tx1.id} and ${tx2.id}`)
            } else {
              linked += 2
            }
          }
        }
      }

      return { linked, errors }
    } catch (error) {
      return {
        linked: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  private isWithinDays(date1: string, date2: string, days: number): boolean {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const diffTime = Math.abs(d2.getTime() - d1.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= days
  }

  private couldBeInternalTransfer(desc1: string, desc2: string): boolean {
    const keywords = [
      'transfer', 'payment', 'credit card', 'cc payment', 'autopay',
      'billpay', 'bill payment', 'account transfer', 'internal transfer'
    ]
    
    const desc1Lower = desc1.toLowerCase()
    const desc2Lower = desc2.toLowerCase()
    
    return keywords.some(keyword => 
      desc1Lower.includes(keyword) || desc2Lower.includes(keyword)
    )
  }
}