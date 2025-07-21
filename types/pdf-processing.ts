import { z } from 'zod'

// Transaction type based on PRD schema
export const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  description: z.string().min(1, 'Description is required'),
  reference_number: z.string().optional().default(''),
  raw_text: z.string().min(1, 'Raw text is required'),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Amount must be a positive number'),
  type: z.enum(['DEBIT', 'CREDIT']),
  original_currency: z.string().optional().default(''),
  original_amount: z.string().optional().nullable()
})

export const statementSchema = z.object({
  statement_type: z.enum(['bank', 'credit_card']),
  bank_name: z.string().min(1, 'Bank name is required'),
  statement_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  statement_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  base_currency: z.string().default('INR'),
  account_number: z.string().optional().default(''),
  account_type: z.string().optional().default(''),
  full_credit_card_number: z.string().optional().default(''),
  card_type: z.string().optional().default(''),
  transactions: z.array(transactionSchema).min(1, 'At least one transaction is required')
})

export type Transaction = z.infer<typeof transactionSchema>
export type Statement = z.infer<typeof statementSchema>

export interface ProcessingResult {
  success: boolean
  statement?: Statement
  error?: {
    code: string
    message: string
  }
  parsing_confidence?: number
}