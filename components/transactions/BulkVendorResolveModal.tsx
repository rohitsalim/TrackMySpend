'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle, XCircle, Loader2, Sparkles, AlertTriangle, Clock } from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import type { Database } from '@/types/database'
import type { VendorResolutionRequest } from '@/types/vendor-resolution'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}

interface VendorResolutionResult {
  transactionId: string
  originalText: string
  status: 'pending' | 'processing' | 'resolved' | 'failed' | 'skipped'
  resolvedName?: string
  confidence?: number
  source?: string
  error?: string
}

interface BulkVendorResolveModalProps {
  transactions: Transaction[]
  open: boolean
  onClose: () => void
}

export function BulkVendorResolveModal({ 
  transactions, 
  open, 
  onClose 
}: BulkVendorResolveModalProps) {
  const { updateTransaction } = useTransactionStore()
  
  const [results, setResults] = useState<VendorResolutionResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)

  // Initialize results when modal opens
  useEffect(() => {
    if (open && transactions.length > 0) {
      const initialResults = transactions
        .filter(tx => {
          // Include transactions that might benefit from vendor resolution
          const originalText = tx.vendor_name_original || tx.vendor_name
          const currentVendorName = tx.vendor_name
          
          // Skip if no original text to work with
          if (!originalText) return false
          
          // Include if original text looks like it needs resolution
          const hasTransactionCodes = /[*#0-9]{3,}|RAZOR|PAYU|UPI|NEFT|IMPS|BILLDESK|CCAVENUE|HDFC|ICICI|AXIS|SBI/.test(originalText)
          
          // Include if original text is very different from current vendor name (likely needs improvement)
          const significantlyDifferent = originalText.length > currentVendorName.length * 1.5 || 
                                       originalText.toLowerCase() !== currentVendorName.toLowerCase()
          
          // Include if vendor name looks generic or has numbers/codes
          const hasCodesInCurrent = /[0-9]{3,}|[*#@]/.test(currentVendorName)
          
          return hasTransactionCodes || significantlyDifferent || hasCodesInCurrent
        })
      
        .map(tx => ({
          transactionId: tx.id,
          originalText: tx.vendor_name_original || tx.vendor_name,
          status: 'pending' as const
        }))
      
      // If no transactions match our smart filtering, include all transactions with original text
      // This ensures we don't show "no transactions" when user explicitly selected some
      let finalResults = initialResults
      if (initialResults.length === 0) {
        finalResults = transactions
          .filter(tx => tx.vendor_name_original && tx.vendor_name_original.trim().length > 0)
          .map(tx => ({
            transactionId: tx.id,
            originalText: tx.vendor_name_original || tx.vendor_name,
            status: 'pending' as const
          }))
      }
      
      setResults(finalResults)
      setCurrentIndex(0)
      setIsProcessing(false)
      setShowResults(false)
    }
  }, [open, transactions])

  const startBulkResolution = async () => {
    if (results.length === 0) return
    
    setIsProcessing(true)
    setShowResults(false)
    
    const batchSize = 5 // Process 5 at a time to avoid rate limits
    const batches = []
    
    for (let i = 0; i < results.length; i += batchSize) {
      batches.push(results.slice(i, i + batchSize))
    }
    
    let processedCount = 0
    
    for (const batch of batches) {
      // Prepare batch request
      const vendorRequests: VendorResolutionRequest[] = batch.map(result => ({
        original_text: result.originalText,
        transaction_id: result.transactionId,
        context: {
          amount: String(transactions.find(tx => tx.id === result.transactionId)?.amount || '0'),
          date: transactions.find(tx => tx.id === result.transactionId)?.transaction_date || '',
          bank_name: 'Unknown'
        }
      }))
      
      // Update status to processing for current batch
      setResults(prev => prev.map(result => 
        batch.some(b => b.transactionId === result.transactionId)
          ? { ...result, status: 'processing' as const }
          : result
      ))
      
      try {
        // Call bulk resolution API
        const response = await fetch('/api/vendors/bulk-resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor_texts: vendorRequests
          })
        })
        
        const apiResult = await response.json()
        
        if (apiResult.success && apiResult.data) {
          // Process successful resolutions
          for (const resolved of apiResult.data.resolved) {
            const transaction = transactions.find(tx => 
              (tx.vendor_name_original || tx.vendor_name) === resolved.original_text
            )
            
            if (transaction && resolved.confidence > 0.6) {
              // Update transaction in database
              try {
                await updateTransaction(transaction.id, {
                  vendor_name: resolved.resolved_name
                })
                
                // Update result
                setResults(prev => prev.map(result =>
                  result.transactionId === transaction.id
                    ? {
                        ...result,
                        status: 'resolved' as const,
                        resolvedName: resolved.resolved_name,
                        confidence: resolved.confidence,
                        source: resolved.source
                      }
                    : result
                ))
              } catch {
                setResults(prev => prev.map(result =>
                  result.transactionId === transaction.id
                    ? {
                        ...result,
                        status: 'failed' as const,
                        error: 'Failed to update transaction'
                      }
                    : result
                ))
              }
            } else {
              // Low confidence, mark as skipped
              setResults(prev => prev.map(result =>
                result.transactionId === transaction?.id
                  ? {
                      ...result,
                      status: 'skipped' as const,
                      resolvedName: resolved.resolved_name,
                      confidence: resolved.confidence,
                      error: 'Low confidence resolution'
                    }
                  : result
              ))
            }
          }
          
          // Process failed resolutions
          for (const failed of apiResult.data.failed) {
            const transaction = transactions.find(tx => 
              (tx.vendor_name_original || tx.vendor_name) === failed.original_text
            )
            
            if (transaction) {
              setResults(prev => prev.map(result =>
                result.transactionId === transaction.id
                  ? {
                      ...result,
                      status: 'failed' as const,
                      error: failed.error
                    }
                  : result
              ))
            }
          }
        }
      } catch {
        // Mark entire batch as failed
        setResults(prev => prev.map(result => 
          batch.some(b => b.transactionId === result.transactionId)
            ? { 
                ...result, 
                status: 'failed' as const,
                error: 'Network error'
              }
            : result
        ))
      }
      
      processedCount += batch.length
      setCurrentIndex(processedCount)
      
      // Add small delay between batches to be respectful to the API
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    setIsProcessing(false)
    setShowResults(true)
  }

  const getStatusIcon = (status: VendorResolutionResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: VendorResolutionResult['status']) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'skipped':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const progressPercentage = results.length > 0 ? (currentIndex / results.length) * 100 : 0
  const resolvedCount = results.filter(r => r.status === 'resolved').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const skippedCount = results.filter(r => r.status === 'skipped').length

  const handleClose = () => {
    if (!isProcessing) {
      onClose()
    }
  }

  if (results.length === 0) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Bulk Vendor Resolution
            </DialogTitle>
            <DialogDescription>
              No transactions need vendor resolution.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 text-center space-y-3">
            <p className="text-muted-foreground">
              No transactions need vendor resolution.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Selected transactions either:</p>
              <p>• Don&apos;t have original transaction text to work with</p>
              <p>• Already have clean, readable vendor names</p>
              <p>• Have been previously resolved</p>
            </div>
            <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
              <p className="font-medium mb-1">Tip:</p>
              <p>Vendor resolution works best on transactions with cryptic names like &quot;RAZOR1234*MERCHANT&quot; or &quot;UPI-12345678-PAYEE&quot;</p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Bulk Vendor Resolution
          </DialogTitle>
          <DialogDescription>
            Resolve {results.length} vendor names using AI analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Progress Section */}
          {(isProcessing || showResults) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Progress: {currentIndex} / {results.length}</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
              
              {/* Stats */}
              {showResults && (
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{resolvedCount} resolved</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>{skippedCount} skipped</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>{failedCount} failed</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Results List */}
          {(isProcessing || showResults) && (
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-4 space-y-3">
                {results.map((result) => (
                  <div key={result.transactionId} className="p-4 rounded-lg border bg-white space-y-3">
                    {/* Status and Original Text */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Original:</div>
                        <div className="text-sm text-gray-700 break-words leading-relaxed font-mono bg-gray-50 px-2 py-1 rounded">
                          {result.originalText}
                        </div>
                      </div>
                    </div>
                    
                    {/* Resolution Result */}
                    {result.resolvedName && (
                      <div className="pl-7">
                        <div className="text-xs text-muted-foreground mb-1">Resolved to:</div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-green-700 break-words">
                            {result.resolvedName}
                          </span>
                          {result.confidence && (
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(result.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {result.error && (
                      <div className="pl-7">
                        <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded break-words">
                          {result.error}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          
          {/* Initial State */}
          {!isProcessing && !showResults && (
            <div className="py-6 text-center space-y-4">
              <p className="text-muted-foreground">
                Ready to resolve {results.length} vendor names using AI analysis.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Transactions with cryptic names will be resolved to friendly names</p>
                <p>• High confidence resolutions will be automatically applied</p>
                <p>• Low confidence suggestions will be skipped for manual review</p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isProcessing}
          >
            {showResults ? 'Close' : 'Cancel'}
          </Button>
          {!showResults && (
            <Button 
              onClick={startBulkResolution}
              disabled={isProcessing || results.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Resolution
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}