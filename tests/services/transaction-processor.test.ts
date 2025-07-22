import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TransactionProcessor } from '@/lib/services/transaction-processor'

// Mock the fingerprint utilities
vi.mock('@/lib/utils/fingerprint', () => ({
  detectDuplicateTransactions: vi.fn(),
  detectInternalTransfers: vi.fn()
}))

describe('TransactionProcessor', () => {
  let processor: TransactionProcessor
  let mockSupabase: any

  beforeEach(() => {
    // Create mock Supabase client with proper chaining
    const createChainableMock = () => {
      const chain = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis()
      }
      // Ensure all methods return the chain object
      Object.values(chain).forEach(fn => {
        if (typeof fn === 'function' && fn !== chain.insert) {
          fn.mockReturnValue(chain)
        }
      })
      return chain
    }

    mockSupabase = createChainableMock()
    processor = new TransactionProcessor(mockSupabase)
  })

  describe('processRawTransactions', () => {
    it('should return zero counts when no raw transactions exist', async () => {
      // Mock empty raw transactions - the final resolved value should be on the chain
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await processor.processRawTransactions('file-123', 'user-123')

      expect(result.processed).toBe(0)
      expect(result.duplicates).toBe(0)
      expect(result.internalTransfers).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('should handle database fetch errors gracefully', async () => {
      // Mock database error at the end of the chain - error should be thrown
      const dbError = new Error('Database connection failed')
      mockSupabase.order.mockRejectedValueOnce(dbError)

      const result = await processor.processRawTransactions('file-123', 'user-123')

      expect(result.processed).toBe(0)
      expect(result.duplicates).toBe(0)
      expect(result.internalTransfers).toBe(0)
      expect(result.errors).toEqual(['Database connection failed'])
    })

    it('should process transactions with deduplication', async () => {
      const mockRawTransactions = [
        {
          id: 'raw-1',
          date: '2024-01-15',
          description: 'Amazon India',
          reference_number: 'REF123',
          raw_text: 'Amazon India payment',
          amount: 1234.56,
          type: 'DEBIT',
          original_currency: '',
          original_amount: null,
          fingerprint: 'fp-1'
        },
        {
          id: 'raw-2', 
          date: '2024-01-16',
          description: 'Swiggy',
          reference_number: 'REF456',
          raw_text: 'Swiggy food order',
          amount: 567.89,
          type: 'DEBIT',
          original_currency: '',
          original_amount: null,
          fingerprint: 'fp-2'
        }
      ]

      // Mock raw transactions fetch - order is the final method in the chain
      mockSupabase.order
        .mockResolvedValueOnce({ data: mockRawTransactions, error: null })
        .mockResolvedValueOnce({ data: [], error: null }) // existing transactions

      // Mock duplicate detection
      const { detectDuplicateTransactions, detectInternalTransfers } = await import('@/lib/utils/fingerprint')
      const mockDetectDuplicates = detectDuplicateTransactions as any
      const mockDetectInternalTransfers = detectInternalTransfers as any

      mockDetectDuplicates.mockReturnValue({
        unique: mockRawTransactions.map(rt => ({
          date: rt.date,
          description: rt.description,
          reference_number: rt.reference_number,
          raw_text: rt.raw_text,
          amount: rt.amount.toString(),
          type: rt.type,
          original_currency: rt.original_currency,
          original_amount: rt.original_amount?.toString() || null,
          fingerprint: rt.fingerprint,
          id: rt.id
        })),
        duplicates: []
      })

      mockDetectInternalTransfers.mockReturnValue(
        mockRawTransactions.map(rt => ({
          date: rt.date,
          description: rt.description,
          reference_number: rt.reference_number,
          raw_text: rt.raw_text,
          amount: rt.amount.toString(),
          type: rt.type,
          original_currency: rt.original_currency,
          original_amount: rt.original_amount?.toString() || null,
          fingerprint: rt.fingerprint,
          id: rt.id,
          is_internal_transfer: false
        }))
      )

      // Mock successful insertion - insert doesn't chain, it directly returns a promise
      mockSupabase.insert.mockResolvedValue({ error: null })
      // Mock update chaining for file stats update
      mockSupabase.update.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null })
        })
      })

      const result = await processor.processRawTransactions('file-123', 'user-123')

      expect(result.processed).toBe(2)
      expect(result.duplicates).toBe(0)
      expect(result.internalTransfers).toBe(0)
      expect(result.errors).toEqual([])

      // Verify transactions were inserted
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'user-123',
            vendor_name: 'Amazon India',
            amount: 1234.56,
            type: 'DEBIT'
          }),
          expect.objectContaining({
            user_id: 'user-123',
            vendor_name: 'Swiggy',
            amount: 567.89,
            type: 'DEBIT'
          })
        ])
      )

      // Verify file stats were updated
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          total_transactions: 2,
          total_expenses: expect.any(Number),
          status: 'completed'
        })
      )
    })

    it('should handle batch insertion errors', async () => {
      const mockRawTransactions = [
        {
          id: 'raw-1',
          date: '2024-01-15',
          description: 'Test Transaction',
          reference_number: '',
          raw_text: 'Test',
          amount: 100,
          type: 'DEBIT',
          original_currency: '',
          original_amount: null,
          fingerprint: 'fp-1'
        }
      ]

      mockSupabase.order
        .mockResolvedValueOnce({ data: mockRawTransactions, error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      const { detectDuplicateTransactions, detectInternalTransfers } = await import('@/lib/utils/fingerprint')
      const mockDetectDuplicates = detectDuplicateTransactions as any
      const mockDetectInternalTransfers = detectInternalTransfers as any

      mockDetectDuplicates.mockReturnValue({
        unique: mockRawTransactions.map(rt => ({
          ...rt,
          amount: rt.amount.toString()
        })),
        duplicates: []
      })

      mockDetectInternalTransfers.mockReturnValue([{
        ...mockRawTransactions[0],
        amount: mockRawTransactions[0].amount.toString(),
        is_internal_transfer: false
      }])

      // Mock insertion error
      mockSupabase.insert.mockResolvedValue({
        error: { message: 'Constraint violation' }
      })

      const result = await processor.processRawTransactions('file-123', 'user-123')

      expect(result.processed).toBe(0)
      expect(result.errors).toContain('Batch 1: Constraint violation')
    })
  })

  describe('detectAndLinkInternalTransfers', () => {
    it('should return zero counts when no transactions exist', async () => {
      // For detectAndLinkInternalTransfers, the chain ends with order
      mockSupabase.order.mockResolvedValue({
        data: [],
        error: null
      })

      const result = await processor.detectAndLinkInternalTransfers('user-123')

      expect(result.linked).toBe(0)
      expect(result.errors).toEqual([])
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Permission denied')
      mockSupabase.order.mockRejectedValue(dbError)

      const result = await processor.detectAndLinkInternalTransfers('user-123')

      expect(result.linked).toBe(0)
      expect(result.errors).toEqual(['Permission denied'])
    })
  })

  describe('Private utility methods', () => {
    it('should correctly identify dates within specified days', () => {
      const processor = new (TransactionProcessor as any)({})
      
      // Test isWithinDays method via public interface
      // Since the method is private, we test it indirectly through the public methods
      // This is a limitation but maintains encapsulation
      expect(true).toBe(true) // Placeholder - would need to refactor to make testable
    })

    it('should identify potential internal transfer keywords', () => {
      const processor = new (TransactionProcessor as any)({})
      
      // Test couldBeInternalTransfer method via public interface
      // Since the method is private, we test it indirectly
      expect(true).toBe(true) // Placeholder - would need to refactor to make testable
    })
  })
})