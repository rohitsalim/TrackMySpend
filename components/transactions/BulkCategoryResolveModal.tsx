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
import { CheckCircle, XCircle, Loader2, Tag, AlertTriangle, Clock } from 'lucide-react'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}

interface CategoryResolutionResult {
  transactionId: string
  vendorName: string
  status: 'pending' | 'processing' | 'resolved' | 'failed' | 'skipped'
  suggestedCategory?: {
    categoryId: string
    categoryName: string
    confidence: number
    source: string
    reasoning?: string
  }
  applied: boolean
  error?: string
}

interface BulkCategoryResolveModalProps {
  transactions: Transaction[]
  open: boolean
  onClose: () => void
}

export function BulkCategoryResolveModal({ 
  transactions, 
  open, 
  onClose 
}: BulkCategoryResolveModalProps) {
  
  const [results, setResults] = useState<CategoryResolutionResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [autoApply, setAutoApply] = useState(true)

  // Initialize results when modal opens
  useEffect(() => {
    if (open && transactions.length > 0) {
      const initialResults = transactions
        .filter(tx => {
          // Include transactions without categories or with low-confidence categories
          return !tx.category_id || !tx.categories
        })
        .map(tx => ({
          transactionId: tx.id,
          vendorName: tx.vendor_name,
          status: 'pending' as const,
          applied: false
        }))
      
      setResults(initialResults)
      setCurrentIndex(0)
      setIsProcessing(false)
      setShowResults(false)
    }
  }, [open, transactions])

  const startBulkCategorization = async () => {
    if (results.length === 0) return
    
    setIsProcessing(true)
    setShowResults(false)
    
    try {
      // Call bulk categorization API
      const response = await fetch('/api/categories/bulk-resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: results.map(r => r.transactionId),
          autoApply: autoApply
        })
      })
      
      const apiResult = await response.json()
      
      if (apiResult.success && apiResult.data) {
        // Update results with API response
        const updatedResults = apiResult.data.results.map((apiResult: {
          transactionId: string
          suggestedCategory?: {
            categoryId: string
            categoryName: string
            confidence: number
            source: string
            reasoning?: string
          }
          applied: boolean
          error?: string
        }) => {
          const result = results.find(r => r.transactionId === apiResult.transactionId)
          if (!result) return null
          
          return {
            ...result,
            status: apiResult.suggestedCategory ? 'resolved' : 'failed',
            suggestedCategory: apiResult.suggestedCategory,
            applied: apiResult.applied,
            error: apiResult.error
          } as CategoryResolutionResult
        }).filter(Boolean)
        
        setResults(updatedResults)
        setCurrentIndex(updatedResults.length)
      } else {
        // Mark all as failed
        setResults(prev => prev.map(result => ({
          ...result,
          status: 'failed' as const,
          error: 'API request failed'
        })))
        setCurrentIndex(results.length)
      }
    } catch {
      // Mark all as failed
      setResults(prev => prev.map(result => ({
        ...result,
        status: 'failed' as const,
        error: 'Network error'
      })))
      setCurrentIndex(results.length)
    }
    
    setIsProcessing(false)
    setShowResults(true)
  }

  const getStatusIcon = (status: CategoryResolutionResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-emerald-500 animate-spin" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'skipped':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }


  const progressPercentage = results.length > 0 ? (currentIndex / results.length) * 100 : 0
  const resolvedCount = results.filter(r => r.status === 'resolved').length
  const failedCount = results.filter(r => r.status === 'failed').length
  const skippedCount = results.filter(r => r.status === 'skipped').length
  const appliedCount = results.filter(r => r.applied).length

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
              <Tag className="h-5 w-5 text-emerald-600" />
              Bulk Category Resolution
            </DialogTitle>
            <DialogDescription>
              No transactions need category resolution.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 text-center space-y-3">
            <p className="text-muted-foreground">
              All selected transactions already have categories assigned.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>To use auto-categorization:</p>
              <p>• Select transactions without categories</p>
              <p>• Or remove existing categories to re-categorize</p>
            </div>
            <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted rounded">
              <p className="font-medium mb-1">Tip:</p>
              <p>Auto-categorization works best with clear vendor names like &quot;Swiggy&quot;, &quot;Uber&quot;, or &quot;Amazon&quot;</p>
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
            <Tag className="h-5 w-5 text-emerald-600" />
            Bulk Category Resolution
          </DialogTitle>
          <DialogDescription>
            Auto-categorize {results.length} transactions using AI analysis.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Auto-apply toggle */}
          {!isProcessing && !showResults && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-sm font-medium">Auto-apply high confidence categories</p>
                <p className="text-xs text-muted-foreground">
                  Categories with 80%+ confidence will be automatically applied
                </p>
              </div>
              <Button
                variant={autoApply ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoApply(!autoApply)}
                className={autoApply ? "bg-emerald-600 hover:bg-emerald-700" : ""}
              >
                {autoApply ? "Enabled" : "Disabled"}
              </Button>
            </div>
          )}

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
                    <span>{resolvedCount} categorized</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4 text-emerald-500" />
                    <span>{appliedCount} applied</span>
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
                    {/* Status and Vendor Name */}
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(result.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Vendor:</div>
                        <div className="text-sm font-medium text-gray-900 break-words">
                          {result.vendorName}
                        </div>
                      </div>
                      {result.applied && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                          Applied
                        </Badge>
                      )}
                    </div>
                    
                    {/* Category Result */}
                    {result.suggestedCategory && (
                      <div className="pl-7">
                        <div className="text-xs text-muted-foreground mb-1">Suggested category:</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-emerald-700 break-words">
                            {result.suggestedCategory.categoryName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(result.suggestedCategory.confidence * 100)}%
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {result.suggestedCategory.source}
                          </Badge>
                        </div>
                        {result.suggestedCategory.reasoning && (
                          <div className="text-xs text-muted-foreground mt-1 bg-gray-50 px-2 py-1 rounded">
                            {result.suggestedCategory.reasoning}
                          </div>
                        )}
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
                Ready to auto-categorize {results.length} transactions using AI analysis.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Vendor names will be analyzed to suggest appropriate categories</p>
                <p>• High confidence suggestions can be automatically applied</p>
                <p>• Low confidence suggestions will be shown for manual review</p>
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
              onClick={startBulkCategorization}
              disabled={isProcessing || results.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Categorizing...
                </>
              ) : (
                <>
                  <Tag className="h-4 w-4 mr-2" />
                  Start Categorization
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}