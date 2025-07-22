import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = []
  const maxVisiblePages = 5
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1)
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }
  
  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="h-8 w-8"
      >
        <ChevronsLeft className="h-4 w-4" />
        <span className="sr-only">First page</span>
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>
      
      {startPage > 1 && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            className="h-8 w-8"
          >
            1
          </Button>
          {startPage > 2 && <span className="px-2">...</span>}
        </>
      )}
      
      {pages.map(page => (
        <Button
          key={page}
          variant={page === currentPage ? 'default' : 'outline'}
          size="sm"
          onClick={() => onPageChange(page)}
          className="h-8 w-8"
        >
          {page}
        </Button>
      ))}
      
      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <span className="px-2">...</span>}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            className="h-8 w-8"
          >
            {totalPages}
          </Button>
        </>
      )}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="h-8 w-8"
      >
        <ChevronsRight className="h-4 w-4" />
        <span className="sr-only">Last page</span>
      </Button>
    </div>
  )
}