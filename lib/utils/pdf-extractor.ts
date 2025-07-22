// PDF text extraction using Google Gemini 2.5 Flash
import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

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
    
    // Convert PDF to base64 for Gemini
    const base64PDF = pdfBuffer.toString('base64')
    
    console.log('Sending PDF to Gemini for text extraction...')
    
    // Use Gemini 2.5 Flash for PDF processing
    const { text: extractedText } = await generateText({
      model: google('gemini-2.5-flash'),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please extract all text content from this PDF document. Return only the raw text content without any formatting, explanations, or additional commentary. If this appears to be a bank/credit card statement, preserve the original structure and spacing as much as possible.'
            },
            {
              type: 'file',
              data: base64PDF,
              mimeType: 'application/pdf'
            }
          ]
        }
      ],
      temperature: 0, // For consistent extraction
    })

    if (!extractedText || extractedText.trim().length === 0) {
      return {
        success: false,
        error: {
          code: 'EMPTY_PDF',
          message: 'PDF contains no readable text or Gemini could not extract text'
        }
      }
    }

    console.log(`Gemini extracted text: ${extractedText.length} characters`)
    console.log('Extracted text content (first 500 chars):', extractedText.substring(0, 500))

    return {
      success: true,
      text: extractedText.trim(),
      metadata: {
        pages: 1, // We don't know exact page count, but we have the content
        info: {
          extractionMethod: 'gemini-2.5-flash'
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