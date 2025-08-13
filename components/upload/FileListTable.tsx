"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  FileText, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Eye, 
  RotateCcw,
  ArrowUpDown,
  Hash,
  Download,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useUploadStore, UploadedFile } from '@/store/uploadStore'
import { useTransactionStore } from '@/store/transaction-store'
import { formatDistanceToNow } from '@/lib/utils'

export function FileListTable() {
  const { files, deleteFile, deleteMultipleFiles, retryFile, fetchUserFiles } = useUploadStore()
  const { refreshAllTransactions } = useTransactionStore()
  const [sortField, setSortField] = useState<keyof UploadedFile>('uploaded_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  
  React.useEffect(() => {
    fetchUserFiles()
  }, [fetchUserFiles])
  
  const handleSort = (field: keyof UploadedFile) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(files.map(f => f.id))
      setSelectedFiles(allIds)
    } else {
      setSelectedFiles(new Set())
    }
  }

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles)
    if (checked) {
      newSelected.add(fileId)
    } else {
      newSelected.delete(fileId)
    }
    setSelectedFiles(newSelected)
  }

  const handleDelete = async (file: UploadedFile) => {
    await deleteFile(file.id)
    // Refresh transaction data to exclude deleted file's transactions
    await refreshAllTransactions()
    setDeleteDialogOpen(false)
    setFileToDelete(null)
  }
  
  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return
    
    setIsBulkDeleting(true)
    try {
      const result = await deleteMultipleFiles(Array.from(selectedFiles))
      
      if (result.successful > 0) {
        // Refresh transaction data to exclude deleted files' transactions
        await refreshAllTransactions()
        // Clear selection
        setSelectedFiles(new Set())
      }
      
      // Show success/error feedback if needed
      if (result.failed > 0) {
        console.error('Some files failed to delete:', result.errors)
        // Could show toast notification here
      }
    } catch (error) {
      console.error('Bulk delete failed:', error)
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteDialogOpen(false)
    }
  }

  const handleRetry = async (file: UploadedFile) => {
    await retryFile(file.id)
  }

  const openDeleteDialog = (file: UploadedFile) => {
    setFileToDelete(file)
    setDeleteDialogOpen(true)
  }

  const openBulkDeleteDialog = () => {
    setBulkDeleteDialogOpen(true)
  }

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="default" className="gap-1 bg-blue-500 hover:bg-blue-600">
            <AlertCircle className="h-3 w-3 animate-pulse" />
            Processing
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        )
    }
  }

  const sortedFiles = [...files].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1
    
    const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const isAllSelected = files.length > 0 && selectedFiles.size === files.length
  const hasSelectedFiles = selectedFiles.size > 0

  if (files.length === 0) {
    return (
      <div className="border-dashed border-2 border-muted-foreground/25 rounded-lg p-16 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4 mx-auto" />
        <h3 className="text-lg font-semibold mb-2">No files uploaded yet</h3>
        <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
          Upload your bank statements to start tracking your financial transactions
        </p>
        <Button asChild>
          <Link href="/">
            Upload Your First Statement
          </Link>
        </Button>
      </div>
    )
  }
  
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6">
          <div>
            <h2 className="text-xl font-semibold">Statement Files</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {files.length} file{files.length !== 1 ? 's' : ''} • {files.filter(f => f.status === 'completed').length} processed successfully
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {files.filter(f => f.status === 'completed').reduce((sum, f) => sum + (f.total_transactions || 0), 0)} total transactions
          </Badge>
        </div>
        
        {/* Table Container */}
        <div className="bg-card rounded-lg overflow-hidden mx-6">
          {/* Bulk Actions Bar */}
          {hasSelectedFiles && (
            <div className="bg-muted/50 border-b px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedFiles.size} file{selectedFiles.size > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFiles(new Set())}
                >
                  Clear selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={openBulkDeleteDialog}
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? 'Deleting...' : 'Delete Selected'}
                </Button>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[45px]">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all files"
                    />
                  </TableHead>
                  <TableHead className="w-[280px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2"
                      onClick={() => handleSort('filename')}
                    >
                      File Name
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[160px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2"
                      onClick={() => handleSort('uploaded_at')}
                    >
                      Upload Date
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px] text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2"
                      onClick={() => handleSort('total_transactions')}
                    >
                      Transactions
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFiles.map((file) => (
                  <TableRow key={file.id} className="group">
                    <TableCell>
                      <Checkbox
                        checked={selectedFiles.has(file.id)}
                        onCheckedChange={(checked) => handleSelectFile(file.id, checked as boolean)}
                        aria-label={`Select ${file.filename}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="font-medium truncate cursor-help">
                                {file.filename}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{file.filename}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">
                          {new Date(file.uploaded_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(file.uploaded_at))} ago
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(file.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      {file.total_transactions ? (
                        <div className="flex items-center justify-center gap-1">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{file.total_transactions}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.status === 'completed' && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href="/transactions" className="cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Transactions
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                <Download className="mr-2 h-4 w-4" />
                                Download Original
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {file.status === 'failed' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleRetry(file)}
                                className="cursor-pointer"
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Retry Processing
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(file)}
                            className="text-destructive cursor-pointer"
                            disabled={file.status === 'processing'}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete File
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{fileToDelete?.filename}&quot;? This action cannot be undone and will remove all associated transaction data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fileToDelete && handleDelete(fileToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Files</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedFiles.size} selected file{selectedFiles.size > 1 ? 's' : ''}? This action cannot be undone and will remove all associated transaction data from these files.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? 'Deleting...' : `Delete ${selectedFiles.size} File${selectedFiles.size > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}