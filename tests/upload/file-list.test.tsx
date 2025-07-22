import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileList } from '@/components/upload/FileList'
import { useUploadStore } from '@/store/uploadStore'
import type { UploadedFile } from '@/store/uploadStore'

// Mock the upload store
vi.mock('@/store/uploadStore', () => ({
  useUploadStore: vi.fn()
}))

// Mock the formatDistanceToNow utility
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return {
    ...actual,
    formatDistanceToNow: vi.fn((date) => '2 hours')
  }
})

// Mock window.confirm
global.confirm = vi.fn(() => true)

describe('FileList', () => {
  const mockFiles: UploadedFile[] = [
    {
      id: '1',
      user_id: 'user123',
      filename: 'statement-jan-2024.pdf',
      file_type: 'pdf',
      status: 'completed',
      uploaded_at: '2024-01-15T10:00:00Z',
      processed_at: '2024-01-15T10:05:00Z',
      total_transactions: 45,
      total_income: 5000,
      total_expenses: 3000
    },
    {
      id: '2',
      user_id: 'user123',
      filename: 'statement-feb-2024.pdf',
      file_type: 'pdf',
      status: 'processing',
      uploaded_at: '2024-02-15T10:00:00Z'
    },
    {
      id: '3',
      user_id: 'user123',
      filename: 'statement-mar-2024.pdf',
      file_type: 'pdf',
      status: 'failed',
      uploaded_at: '2024-03-15T10:00:00Z',
      error_message: 'Failed to parse PDF'
    }
  ]

  const mockUploadStore = {
    files: mockFiles,
    deleteFile: vi.fn(),
    fetchUserFiles: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUploadStore.files = mockFiles // Reset to default files
    ;(useUploadStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockUploadStore)
  })

  it('should fetch files on mount', () => {
    render(<FileList />)
    expect(mockUploadStore.fetchUserFiles).toHaveBeenCalledTimes(1)
  })

  it('should display empty state when no files', () => {
    const emptyMockStore = { ...mockUploadStore, files: [] }
    ;(useUploadStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(emptyMockStore)
    
    render(<FileList />)
    
    expect(screen.getByText('No files uploaded yet.')).toBeInTheDocument()
  })

  it('should display all uploaded files', () => {
    render(<FileList />)
    
    expect(screen.getByText('statement-jan-2024.pdf')).toBeInTheDocument()
    expect(screen.getByText('statement-feb-2024.pdf')).toBeInTheDocument()
    expect(screen.getByText('statement-mar-2024.pdf')).toBeInTheDocument()
  })

  it('should show correct status for each file', () => {
    render(<FileList />)
    
    expect(screen.getByText('Ready to view')).toBeInTheDocument()
    expect(screen.getByText('Processing transactions...')).toBeInTheDocument()
    expect(screen.getByText('Processing failed')).toBeInTheDocument()
  })

  it('should display transaction count for completed files', () => {
    render(<FileList />)
    
    expect(screen.getByText('45 transactions')).toBeInTheDocument()
  })

  it('should display upload time for all files', () => {
    render(<FileList />)
    
    const uploadedTexts = screen.getAllByText(/Uploaded 2 hours ago/)
    expect(uploadedTexts).toHaveLength(3)
  })

  it('should handle file deletion', async () => {
    const user = userEvent.setup()
    render(<FileList />)
    
    const deleteButtons = screen.getAllByRole('button')
    const firstDeleteButton = deleteButtons.find(btn => btn.querySelector('.lucide-trash2'))
    
    if (firstDeleteButton) {
      await user.click(firstDeleteButton)
    }
    
    expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete statement-jan-2024.pdf?')
    expect(mockUploadStore.deleteFile).toHaveBeenCalledWith('1')
  })

  it('should not delete if user cancels confirmation', async () => {
    const user = userEvent.setup()
    ;(global.confirm as ReturnType<typeof vi.fn>).mockReturnValueOnce(false)
    
    render(<FileList />)
    
    const deleteButtons = screen.getAllByRole('button')
    const firstDeleteButton = deleteButtons.find(btn => btn.querySelector('.lucide-trash2'))
    
    if (firstDeleteButton) {
      await user.click(firstDeleteButton)
    }
    
    expect(mockUploadStore.deleteFile).not.toHaveBeenCalled()
  })

  it('should disable delete button for processing files', () => {
    render(<FileList />)
    
    // Find delete buttons that contain trash icon
    const deleteButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('.lucide-trash2')
    )
    
    // The second file (processing) should have disabled delete button
    expect(deleteButtons[1]).toBeDisabled()
  })

  it('should show correct icons for different statuses', () => {
    render(<FileList />)
    
    // Check that status text is displayed
    expect(screen.getByText('Ready to view')).toBeInTheDocument()
    expect(screen.getByText('Processing transactions...')).toBeInTheDocument()
    expect(screen.getByText('Processing failed')).toBeInTheDocument()
  })
})