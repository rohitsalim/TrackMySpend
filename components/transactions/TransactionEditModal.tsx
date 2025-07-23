'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, CheckCircle, XCircle, Sparkles, Loader2 } from 'lucide-react'
import { useTransactionStore } from '@/store/transaction-store'
import { formatCurrency, formatDate } from '@/lib/utils/formatters'
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal'
import { flattenCategoryTree, buildCategoryTree } from '@/types/categories'
import type { Database } from '@/types/database'
import type { VendorResolutionResponse } from '@/types/vendor-resolution'

type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  categories?: Database['public']['Tables']['categories']['Row'] | null
}

interface TransactionEditModalProps {
  transaction: Transaction
  onClose: () => void
}

export function TransactionEditModal({ transaction, onClose }: TransactionEditModalProps) {
  const { categories, updateTransaction, fetchCategories } = useTransactionStore()
  
  const [vendorName, setVendorName] = useState(transaction.vendor_name)
  const [categoryId, setCategoryId] = useState(transaction.category_id || 'none')
  const [notes, setNotes] = useState(transaction.notes || '')
  const [isLoading, setIsLoading] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)
  
  // AI Vendor Suggestion State
  const [vendorSuggestion, setVendorSuggestion] = useState<VendorResolutionResponse['data'] | null>(null)
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)
  const [hasSuggestionBeenShown, setHasSuggestionBeenShown] = useState(false)
  
  // Get hierarchical categories for dropdown
  const categoryTree = buildCategoryTree(categories)
  const flatCategories = flattenCategoryTree(categoryTree)
  
  // AI Vendor Suggestion Functions
  const fetchVendorSuggestion = useCallback(async (originalText: string) => {
    if (!originalText || originalText.length < 3) return
    
    setIsLoadingSuggestion(true)
    setSuggestionError(null)
    
    try {
      const response = await fetch('/api/vendors/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_text: originalText,
          transaction_id: transaction.id,
          context: {
            amount: transaction.amount,
            date: transaction.transaction_date,
            bank_name: 'Unknown' // Could get from transaction metadata
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success && result.data) {
        // Only show suggestion if it's different from current vendor name
        if (result.data.resolved_name !== vendorName && 
            result.data.resolved_name !== originalText &&
            result.data.confidence > 0.5) {
          setVendorSuggestion(result.data)
          setHasSuggestionBeenShown(true)
        }
      }
    } catch (error) {
      setSuggestionError('Failed to get AI suggestion')
      console.error('Vendor suggestion error:', error)
    } finally {
      setIsLoadingSuggestion(false)
    }
  }, [transaction.id, transaction.amount, transaction.transaction_date, vendorName])
  
  // Auto-fetch suggestion on modal open if original text looks like it needs resolution
  useEffect(() => {
    if (!hasSuggestionBeenShown && transaction.vendor_name_original) {
      const originalText = transaction.vendor_name_original
      const currentVendorName = transaction.vendor_name
      
      // Check if original text looks like it needs AI resolution
      const hasTransactionCodes = /[*#0-9]{3,}|RAZOR|PAYU|UPI|NEFT|IMPS|BILLDESK|CCAVENUE|HDFC|ICICI|AXIS|SBI/.test(originalText)
      
      // Check if original is significantly different from current (likely needs improvement)
      const significantlyDifferent = originalText.length > currentVendorName.length * 1.2 || 
                                   originalText.toLowerCase() !== currentVendorName.toLowerCase()
      
      // Check if current vendor name has codes/numbers that could be cleaned up
      const hasCodesInCurrent = /[0-9]{3,}|[*#@]/.test(currentVendorName)
      
      const needsResolution = hasTransactionCodes || significantlyDifferent || hasCodesInCurrent
      
      if (needsResolution) {
        // Delay to let modal open animation complete
        setTimeout(() => {
          fetchVendorSuggestion(originalText)
        }, 300)
      }
    }
  }, [fetchVendorSuggestion, transaction.vendor_name_original, transaction.vendor_name, hasSuggestionBeenShown])
  
  const handleAcceptSuggestion = () => {
    if (vendorSuggestion) {
      setVendorName(vendorSuggestion.resolved_name)
      setVendorSuggestion(null)
    }
  }
  
  const handleRejectSuggestion = () => {
    setVendorSuggestion(null)
  }
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-orange-600 bg-orange-50'
  }
  
  // Helper function for confidence icon (can be used in future enhancements)
  // const getConfidenceIcon = (confidence: number) => {
  //   if (confidence >= 0.8) return CheckCircle
  //   if (confidence >= 0.6) return AlertCircle
  //   return AlertCircle
  // }
  
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'llm': return 'AI Analysis'
      case 'user': return 'User Verified'
      case 'google': return 'Web Search'
      default: return 'Unknown'
    }
  }
  
  const handleSave = async () => {
    setIsLoading(true)
    
    try {
      // Update transaction
      await updateTransaction(transaction.id, {
        vendor_name: vendorName,
        category_id: categoryId === 'none' ? null : categoryId,
        notes: notes || null,
      })
      
      // Learn from user correction if they changed the vendor name
      if (vendorName !== transaction.vendor_name && 
          transaction.vendor_name_original && 
          vendorName.trim().length > 0) {
        
        try {
          // Call the vendor mapping API to learn from the correction
          await fetch('/api/vendors/mappings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              original_text: transaction.vendor_name_original,
              mapped_name: vendorName,
              confidence: 0.95, // High confidence for user corrections
              source: 'user'
            })
          })
        } catch (learningError) {
          // Don't fail the main save if learning fails
          console.warn('Failed to save vendor mapping for learning:', learningError)
        }
      }
      
      onClose()
    } catch (error) {
      console.error('Failed to update transaction:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update vendor name, category, or add notes to this transaction.
            </DialogDescription>
          </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Transaction Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p className="font-medium">{formatDate(transaction.transaction_date)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Amount</Label>
              <p className={`font-medium ${
                transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
              }`}>
                {transaction.type === 'CREDIT' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>
          
          {/* Original Description */}
          {transaction.vendor_name_original !== transaction.vendor_name && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Original Description</Label>
              <p className="text-sm bg-muted p-2 rounded">{transaction.vendor_name_original}</p>
            </div>
          )}
          
          {/* Vendor Name with AI Suggestion */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vendor">Vendor Name</Label>
              <div className="flex items-center gap-2">
                {isLoadingSuggestion && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Getting AI suggestion...
                  </div>
                )}
                {!isLoadingSuggestion && !vendorSuggestion && transaction.vendor_name_original && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchVendorSuggestion(transaction.vendor_name_original || '')}
                    className="h-auto p-1 text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Get AI Suggestion
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Input
                id="vendor"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="Enter vendor name"
              />
              
              {/* AI Vendor Suggestion */}
              {vendorSuggestion && (
                <div className="border rounded-lg p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">AI Suggestion</span>
                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceColor(vendorSuggestion.confidence)}`}>
                          {Math.round(vendorSuggestion.confidence * 100)}% confident
                        </div>
                      </div>
                      
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {vendorSuggestion.resolved_name}
                      </p>
                      
                      <div className="flex items-center gap-3 text-xs text-gray-600">
                        <span>Source: {getSourceLabel(vendorSuggestion.source)}</span>
                        {vendorSuggestion.reasoning && (
                          <span className="truncate">• {vendorSuggestion.reasoning}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAcceptSuggestion}
                        className="h-7 px-2 text-xs bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleRejectSuggestion}
                        className="h-7 px-2 text-xs bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Sources attribution */}
                  {vendorSuggestion.sources && vendorSuggestion.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <p className="text-xs text-blue-700 mb-1">Sources:</p>
                      <div className="space-y-1">
                        {vendorSuggestion.sources.slice(0, 2).map((source, index) => (
                          <div key={index} className="text-xs text-blue-600 truncate">
                            • {source.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Error state */}
              {suggestionError && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {suggestionError}
                </div>
              )}
            </div>
          </div>
          
          {/* Category */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category">Category</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateCategory(true)}
                className="h-auto p-1 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New Category
              </Button>
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {flatCategories.map(({ category, level }) => (
                  <SelectItem key={category.id} value={category.id}>
                    {'  '.repeat(level)}{category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Create Category Modal */}
    <CreateCategoryModal
      open={showCreateCategory}
      onClose={() => setShowCreateCategory(false)}
      onSuccess={() => {
        setShowCreateCategory(false)
        fetchCategories() // Refresh categories after creation
      }}
    />
    </>
  )
}