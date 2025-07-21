import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadModal } from '@/components/upload/upload-modal'
import { useUploadStore } from '@/store/uploadStore'

// Mock the upload store
vi.mock('@/store/uploadStore', () => ({
  useUploadStore: vi.fn()
}))

// Mock react-dropzone
vi.mock('react-dropzone', () => ({
  useDropzone: vi.fn((options) => ({
    getRootProps: () => ({
      onClick: vi.fn(),
      'data-testid': 'dropzone'
    }),
    getInputProps: () => ({
      type: 'file',
      accept: options.accept,
      'data-testid': 'file-input'
    }),
    isDragActive: false
  }))
}))

describe('UploadModal', () => {
  const mockUploadStore = {
    uploadFiles: vi.fn(),
    uploadState: 'idle' as const,
    uploadProgress: {},
    error: null as string | null,
    resetUploadState: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useUploadStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockUploadStore)
  })

  it('should render when open', () => {
    render(<UploadModal open={true} onOpenChange={vi.fn()} />)
    
    expect(screen.getByText('Upload Bank Statements')).toBeInTheDocument()
    expect(screen.getByText(/Upload your bank or credit card statements/)).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<UploadModal open={false} onOpenChange={vi.fn()} />)
    
    expect(screen.queryByText('Upload Bank Statements')).not.toBeInTheDocument()
  })

  it('should display dropzone area', () => {
    render(<UploadModal open={true} onOpenChange={vi.fn()} />)
    
    expect(screen.getByText(/Drag & drop PDF files here/)).toBeInTheDocument()
    expect(screen.getByText(/Maximum 20 files, up to 10MB each/)).toBeInTheDocument()
  })

  it('should display upload progress', () => {
    const uploadingMockStore = {
      ...mockUploadStore,
      uploadState: 'uploading' as const,
      uploadProgress: { 'test.pdf': 50 }
    }
    ;(useUploadStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(uploadingMockStore)
    
    render(<UploadModal open={true} onOpenChange={vi.fn()} />)
    
    // The modal should show uploading state
    expect(screen.getByText('Uploading...')).toBeInTheDocument()
  })

  it('should display upload error', () => {
    const errorMockStore = {
      ...mockUploadStore,
      error: 'Upload failed due to network error'
    }
    ;(useUploadStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(errorMockStore)
    
    render(<UploadModal open={true} onOpenChange={vi.fn()} />)
    
    expect(screen.getByText('Upload failed due to network error')).toBeInTheDocument()
  })

  it('should display success message', () => {
    const completedMockStore = {
      ...mockUploadStore,
      uploadState: 'completed' as const
    }
    ;(useUploadStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(completedMockStore)
    
    render(<UploadModal open={true} onOpenChange={vi.fn()} />)
    
    expect(screen.getByText('Files uploaded successfully!')).toBeInTheDocument()
  })

  it('should close modal on cancel', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    
    render(<UploadModal open={true} onOpenChange={onOpenChange} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockUploadStore.resetUploadState).toHaveBeenCalled()
  })

  it('should not close during upload', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const uploadingMockStore = {
      ...mockUploadStore,
      uploadState: 'uploading' as const
    }
    ;(useUploadStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(uploadingMockStore)
    
    render(<UploadModal open={true} onOpenChange={onOpenChange} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    expect(cancelButton).toBeDisabled()
  })

  it('should have upload button disabled when no files', () => {
    // Reset mock to idle state for this test
    const idleMockStore = {
      ...mockUploadStore,
      uploadState: 'idle' as const,
      error: null
    }
    ;(useUploadStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(idleMockStore)
    
    render(<UploadModal open={true} onOpenChange={vi.fn()} />)
    
    const uploadButton = screen.getByRole('button', { name: /upload 0 files/i })
    expect(uploadButton).toBeDisabled()
  })
})