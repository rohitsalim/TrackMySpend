import { z } from 'zod'

// Standard API Response format per .cursorrules
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  meta?: {
    page?: number
    totalPages?: number
    totalCount?: number
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Process API Request Schema
export const processRequestSchema = z.object({
  fileId: z.string().uuid('File ID must be a valid UUID')
})

export type ProcessRequest = z.infer<typeof processRequestSchema>

// Process API Response Data
export interface ProcessResponseData {
  fileId: string
  statement: {
    type: 'bank' | 'credit_card'
    bank_name: string
    statement_period: {
      start: string
      end: string
    }
  }
  processing_results: {
    total_transactions: number
    stored_transactions: number
    duplicates_found: number
    internal_transfers: number
    parsing_confidence: number
    total_income: string  // Using string for monetary values
    total_expenses: string  // Using string for monetary values
  }
}

export type ProcessApiResponse = ApiResponse<ProcessResponseData>

// Upload API Response Data (already follows standard)
export interface UploadResponseData {
  uploaded: Array<{
    id: string
    filename: string
    file_url: string
    status: string
    uploaded_at: string
  }>
  failed: number
  total: number
}

export type UploadApiResponse = ApiResponse<UploadResponseData>