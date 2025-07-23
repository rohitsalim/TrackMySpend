// PDF text extraction using pdf-parse library (optimized from Gemini)
import pdf from 'pdf-parse'

export interface PDFExtractionResult {
  success: boolean
  text?: string
  error?: {
    code: string
    message: string
  }
  metadata?: {
    pages: number
    info?: Record<string, unknown>
  }
}

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
  try {
    // Validate buffer
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
      return {
        success: false,
        error: {
          code: 'INVALID_BUFFER',
          message: 'Invalid PDF buffer provided'
        }
      }
    }

    if (pdfBuffer.length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_BUFFER',
          message: 'PDF buffer is empty'
        }
      }
    }

    console.log('Processing PDF buffer of size:', pdfBuffer.length, 'bytes')
    console.log('Using pdf-parse for text extraction...')
    
    // Use pdf-parse for text extraction
    const data = await pdf(pdfBuffer)

    if (!data.text || data.text.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_PDF',
          message: 'PDF contains no readable text or pdf-parse could not extract text'
        }
      }
    }

    console.log(`pdf-parse extracted text: ${data.text.length} characters`)
    console.log('Extracted text content (first 500 chars):', data.text.substring(0, 500))

    return {
      success: true,
      text: data.text.trim(),
      metadata: {
        pages: data.numpages,
        info: {
          extractionMethod: 'pdf-parse',
          ...data.info
        }
      }
    }
    
  } catch (error) {
    console.error('PDF extraction error:', error)
    
    return {
      success: false,
      error: {
        code: 'EXTRACTION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to extract text from PDF'
      }
    }
  }
}

export function preprocessPDFText(text: string): string {
  return text
    // Remove common PDF artifacts
    .replace(/[^\S\r\n]+/g, ' ') // Replace multiple spaces/tabs with single space
    .replace(/\r\n/g, '\n') // Windows line endings to Unix
    .replace(/\r/g, '\n') // Mac line endings to Unix
    .replace(/\n{3,}/g, '\n\n') // Multiple newlines to double newline
    .replace(/[""]/g, '"') // Normalize quotes
    .replace(/['']/g, "'") // Normalize apostrophes
    .replace(/…/g, '...') // Replace ellipsis
    .replace(/–|—/g, '-') // Normalize dashes
    .replace(/ +/g, ' ') // Multiple spaces to single space
    .trim()
}