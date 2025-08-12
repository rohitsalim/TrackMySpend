"use client"

import React from 'react'
import Link from 'next/link'
import { FileText, Trash2, Clock, CheckCircle, XCircle, AlertCircle, Eye, RotateCcw, TrendingUp, TrendingDown, Calendar, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useUploadStore, UploadedFile } from '@/store/uploadStore'
import { formatDistanceToNow } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/formatters'

export function FileList() {
  const { files, deleteFile, retryFile, fetchUserFiles } = useUploadStore()
  
  React.useEffect(() => {
    fetchUserFiles()
  }, [fetchUserFiles])
  
  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Pending</span>
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="default" className="gap-1.5 bg-blue-500 hover:bg-blue-600">
            <AlertCircle className="h-3 w-3 animate-pulse" />
            <span>Processing</span>
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="default" className="gap-1.5 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" />
            <span>Completed</span>
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1.5">
            <XCircle className="h-3 w-3" />
            <span>Failed</span>
          </Badge>
        )
    }
  }

  const getFileTypeIcon = (_filename: string) => {
    return <FileText className="h-8 w-8 text-blue-500" />
  }
  
  const handleDelete = async (file: UploadedFile) => {
    await deleteFile(file.id)
  }
  
  const handleRetry = async (file: UploadedFile) => {
    await retryFile(file.id)
  }
  
  if (files.length === 0) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No files uploaded yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            Upload your bank statements to start tracking your financial transactions
          </p>
          <Button asChild>
            <Link href="/">
              Upload Your First Statement
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Statement Files</CardTitle>
            <CardDescription className="mt-1">
              {files.length} file{files.length !== 1 ? 's' : ''} • {files.filter(f => f.status === 'completed').length} processed successfully
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {files.filter(f => f.status === 'completed').reduce((sum, f) => sum + (f.total_transactions || 0), 0)} total transactions
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {files.map((file) => (
            <div
              key={file.id}
              className="group relative p-6 hover:bg-muted/20 transition-colors duration-200"
            >
              {/* Main File Info */}
              <div className="flex items-start gap-4">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileTypeIcon(file.filename)}
                </div>
                
                {/* File Details */}
                <div className="flex-1 min-w-0 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                        {file.filename.replace(/\.(pdf|PDF)$/, '')}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Uploaded {formatDistanceToNow(new Date(file.uploaded_at))} ago</span>
                        </div>
                        {file.total_transactions && (
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            <span>{file.total_transactions} transactions</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                      {getStatusBadge(file.status)}
                    </div>
                  </div>
                  
                  {/* Person Inferred */}
                  {file.person_inferred && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Account Holder: {file.person_inferred}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Financial Summary - Only for completed files */}
                  {file.status === 'completed' && (file.total_income || file.total_expenses) && (() => {
                    // Build array of financial metrics that have data
                    const metrics = []
                    
                    if (file.total_income && file.total_income > 0) {
                      metrics.push(
                        <div key="income" className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900/30">
                          <TrendingUp className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-green-700 dark:text-green-400">Income</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(file.total_income)}
                            </p>
                          </div>
                        </div>
                      )
                    }
                    
                    if (file.total_expenses && file.total_expenses > 0) {
                      metrics.push(
                        <div key="expenses" className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/30">
                          <TrendingDown className="h-5 w-5 text-red-500 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-red-700 dark:text-red-400">Expenses</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">
                              {formatCurrency(file.total_expenses)}
                            </p>
                          </div>
                        </div>
                      )
                    }
                    
                    if (file.total_income && file.total_expenses) {
                      const netBalance = file.total_income - file.total_expenses
                      const isPositive = netBalance >= 0
                      
                      metrics.push(
                        <div key="net" className={`flex items-center gap-3 p-3 rounded-lg ${
                          isPositive 
                            ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30'
                            : 'bg-orange-50 border border-orange-200 dark:bg-orange-950/20 dark:border-orange-900/30'
                        }`}>
                          <div className={`h-5 w-5 rounded-full flex-shrink-0 ${
                            isPositive ? 'bg-blue-500' : 'bg-orange-500'
                          }`} />
                          <div className="flex-1">
                            <p className={`text-xs font-medium ${
                              isPositive 
                                ? 'text-blue-700 dark:text-blue-400' 
                                : 'text-orange-700 dark:text-orange-400'
                            }`}>
                              Net Balance
                            </p>
                            <p className={`text-lg font-bold ${
                              isPositive 
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-orange-600 dark:text-orange-400'
                            }`}>
                              {formatCurrency(netBalance)}
                            </p>
                          </div>
                        </div>
                      )
                    }
                    
                    // Dynamic grid classes based on number of metrics
                    const gridClass = metrics.length === 1 
                      ? 'grid-cols-1' 
                      : metrics.length === 2 
                      ? 'grid-cols-1 sm:grid-cols-2' 
                      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    
                    return (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Financial Summary</p>
                        <div className={`grid ${gridClass} gap-3`}>
                          {metrics}
                        </div>
                      </div>
                    )
                  })()}
                  
                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-2">
                    {file.status === 'completed' && (
                      <Button asChild size="sm" variant="default">
                        <Link href="/transactions" className="gap-2">
                          <Eye className="h-4 w-4" />
                          View Transactions
                        </Link>
                      </Button>
                    )}
                    
                    {file.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(file)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Retry Processing
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={file.status === 'processing'}
                          className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete File</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &quot;{file.filename}&quot;? This action cannot be undone and will remove all associated transaction data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(file)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete File
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}