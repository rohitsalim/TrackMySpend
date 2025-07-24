import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { VendorMappingCache } from '@/lib/services/vendor-mapping-cache'
import type { 
  VendorResolutionRequest,
  VendorResolutionResponse,
  GroundingSource,
  VendorAPIResponse
} from '@/types/vendor-resolution'

/**
 * Vendor Resolver using Gemini 2.5 Flash with Google Search Grounding
 * 
 * This class handles the "magic moment" of deanonymizing bank transaction
 * vendor names using AI and real-time web search capabilities.
 * 
 * Features:
 * - Gemini 2.5 Flash with Google Search grounding for real-time vendor identification
 * - Intelligent caching system to reduce API calls and improve performance
 * - Confidence scoring with source attribution
 * - Learning from user corrections and shared intelligence
 */
export class VendorResolver {
  private supabase: Awaited<ReturnType<typeof createClient>>
  private cache: VendorMappingCache

  constructor(supabaseClient: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabaseClient
    this.cache = new VendorMappingCache(supabaseClient)
  }

  /**
   * Resolve a single vendor name from transaction description
   */
  async resolveVendor(request: VendorResolutionRequest, userId?: string): Promise<VendorResolutionResponse> {
    try {
      // Step 1: Check intelligent cache first for performance
      const cachedMapping = await this.cache.getBestMapping(request.original_text, userId)
      if (cachedMapping) {
        return {
          success: true,
          data: {
            original_text: request.original_text,
            resolved_name: cachedMapping.mapped_name,
            confidence: cachedMapping.confidence ?? 0.5,
            source: cachedMapping.user_id ? 'user' as const : 'llm' as const,
            reasoning: `Found in ${cachedMapping.user_id ? 'user' : 'global'} vendor mapping cache`
          }
        }
      }

      // Step 2: Use Gemini 2.5 Flash with grounding for AI resolution
      const aiResult = await this.resolveWithGeminiGrounding(request)
      if (aiResult.success && aiResult.data) {
        // Step 3: Cache the result using intelligent cache
        await this.cache.cacheMapping(
          request.original_text,
          aiResult.data.resolved_name,
          aiResult.data.confidence,
          'llm'
        )
        
        return aiResult
      }

      // Step 4: Fallback - return original text with low confidence
      return {
        success: true,
        data: {
          original_text: request.original_text,
          resolved_name: this.cleanVendorName(request.original_text),
          confidence: 0.2,
          source: 'user' as const,
          reasoning: 'AI resolution failed, using cleaned original text'
        }
      }

    } catch (error) {
      console.error('Vendor resolution error:', error)
      return {
        success: false,
        error: {
          code: 'VENDOR_RESOLUTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      }
    }
  }

  /**
   * Resolve vendors using Gemini 2.5 Flash with Google Search grounding
   */
  private async resolveWithGeminiGrounding(
    request: VendorResolutionRequest
  ): Promise<VendorResolutionResponse> {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return {
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'Google Gemini API key is not configured'
        }
      }
    }

    try {
      // Build the vendor resolution prompt
      const prompt = this.buildVendorResolutionPrompt(request)

      // Use Gemini 2.5 Flash with Google Search grounding and thinking budget
      const response = await generateText({
        model: google('gemini-2.5-pro', {
          useSearchGrounding: true,
          dynamicRetrievalConfig: {
            mode: 'MODE_DYNAMIC',
            dynamicThreshold: 0.7
          }
        }),
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 8192
            }
          }
        },
        prompt,
        temperature: 0.1, // Low temperature for consistent results
      })

      // Parse the grounding response
      const parsedResult = this.parseGroundingResponse(response, request.original_text)
      
      return {
        success: true,
        data: parsedResult
      }

    } catch (error) {
      console.error('Gemini grounding error:', error)
      return {
        success: false,
        error: {
          code: 'GEMINI_GROUNDING_FAILED',
          message: error instanceof Error ? error.message : 'AI resolution failed'
        }
      }
    }
  }

  /**
   * Build an intelligent prompt for vendor resolution
   */
  private buildVendorResolutionPrompt(request: VendorResolutionRequest): string {
    const { original_text, context } = request
    
    let prompt = `You are a financial transaction analyst specializing in identifying Indian businesses and merchants from transaction descriptions. Your goal is to find the most recognizable BRAND NAME that customers would know.

Think through this step by step:
1. First, identify if this is a UPI transaction and determine if it's to a person or company
2. For UPI person payments: Extract and return the clean person's name
3. For UPI company payments: Focus on de-anonymizing the business/merchant name
4. For non-UPI transactions: Identify payment gateway codes (RAZOR, PAYU, etc.) and underlying merchants
5. Search online for information about companies to find their brand names
6. Prioritize brand names that customers would recognize over legal entity names

Task: Identify the vendor for this transaction: "${original_text}"

Context:`

    if (context?.amount) {
      prompt += `\n- Transaction Amount: ${context.amount}`
    }
    if (context?.date) {
      prompt += `\n- Transaction Date: ${context.date}`
    }
    if (context?.bank_name) {
      prompt += `\n- Bank: ${context.bank_name}`
    }

    prompt += `

Critical Instructions:

UPI TRANSACTION HANDLING:
1. If the transaction starts with "UPI-" or contains UPI patterns:
   - Check if it's a PERSON payment: Look for individual names, phone numbers, UPI handles like "JOHN DOE", "REKHA P-9611834117", "username@paytm"
   - For PERSON payments: Return the clean person name (e.g., "UPI-REKHA P-9611834117" → "Rekha P")
   - For COMPANY payments: Identify and de-anonymize the business name

2. UPI Person Payment Examples:
   - "UPI-REKHA P-9611834117eYBL" → "Rekha P"
   - "UPI-SYED NAZIM" → "Syed Nazim" 
   - "UPI-SHAHNAWAZ ALAM" → "Shahnawaz Alam"
   - "JOHN.DOE@paytm" → "John Doe"

3. UPI Company Payment Examples:
   - "UPI-AMAZON INDIA" → "Amazon" (search online to confirm)
   - "UPI-BHARATPE-MERCHANT123" → "BharatPe"
   - "UPI-SWIGGY*ORDER12345" → "Swiggy"

NON-UPI TRANSACTION HANDLING:
1. SEARCH ONLINE to find current information about businesses
2. PRIORITIZE BRAND NAMES over legal company names
3. For Indian companies, use their popular brand/app names (e.g., "Hudle" not "Hsquare Sports Private Limited")
4. If it's a payment gateway transaction, identify the underlying merchant's brand name

Brand Name Priority Examples:
- "HSQUARE SPORTS" → "Hudle" (the popular sports app brand)
- "BUNDL TECHNOLOGIES" → "Swiggy" (the food delivery brand)
- "ANI TECHNOLOGIES" → "Ola" (the ride-hailing brand)
- "ZOMATO MEDIA" → "Zomato" (the brand everyone knows)

Payment Gateway Patterns:
- "RAZOR1234*SWIGGY" → "Swiggy"
- "PAYU*BOOKMYSHOW" → "BookMyShow"

Response format:
Business Name: [Consumer-facing brand name or clean person name]
Confidence: [0.0-1.0 confidence score]
Reasoning: [Brief explanation of identification - specify if it's a UPI person payment, UPI company payment, or regular business]`

    return prompt
  }

  /**
   * Parse Gemini response with grounding sources
   */
  private parseGroundingResponse(
    response: {
      text: string;
      providerMetadata?: {
        google?: {
          groundingMetadata?: {
            webSearchQueries?: string[];
          };
        };
      };
      sources?: Array<{
        title?: string;
        url?: string;
        snippet?: string;
      }>;
    },
    originalText: string
  ): VendorResolutionResponse['data'] {
    const text = response.text || ''
    
    // Extract business name using regex patterns
    const businessNameMatch = text.match(/Business Name:\s*([^\n,]+)/i)
    const confidenceMatch = text.match(/Confidence:\s*([0-9.]+)/i)
    const reasoningMatch = text.match(/Reasoning:\s*([^\n]+)/i)
    
    const resolvedName = businessNameMatch?.[1]?.trim() || this.cleanVendorName(originalText)
    const confidence = confidenceMatch?.[1] ? parseFloat(confidenceMatch[1]) : 0.5
    const reasoning = reasoningMatch?.[1]?.trim() || 'AI-based vendor identification with web search'

    // Extract grounding sources from the response
    const sources: GroundingSource[] = []
    
    if (response.sources && Array.isArray(response.sources)) {
      for (const source of response.sources.slice(0, 3)) {
        if (source.title && source.url) {
          sources.push({
            title: source.title,
            url: source.url,
            snippet: source.snippet || ''
          })
        }
      }
    }

    // Check grounding metadata for additional context
    const hasGroundingData = response.providerMetadata?.google?.groundingMetadata?.webSearchQueries

    return {
      original_text: originalText,
      resolved_name: resolvedName,
      confidence: Math.min(1.0, Math.max(0.0, confidence)), // Clamp between 0-1
      source: (sources.length > 0 || hasGroundingData) ? 'google' as const : 'llm' as const,
      sources,
      reasoning
    }
  }

  /**
   * Learn from user correction to improve future mappings
   */
  async learnFromUserCorrection(
    originalText: string,
    userCorrectedName: string,
    userId: string
  ): Promise<void> {
    await this.cache.learnFromUserCorrection(originalText, userCorrectedName, userId)
  }

  /**
   * Clean vendor name by removing common transaction artifacts
   */
  private cleanVendorName(text: string): string {
    return text
      .replace(/^(UPI|NEFT|IMPS|RTGS)[:\-\s]*/i, '') // Remove payment type prefixes
      .replace(/\*+/g, ' ') // Replace asterisks with spaces
      .replace(/[0-9]{4,}/g, '') // Remove long numbers
      .replace(/\b(RAZOR|PAYU|BILLDESK|CCAVENUE)\d*/gi, '') // Remove payment gateways
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Batch resolve multiple vendors (for background processing)
   */
  async bulkResolveVendors(
    requests: VendorResolutionRequest[],
    userId?: string
  ): Promise<VendorAPIResponse<{
    resolved: Array<VendorResolutionResponse['data']>
    failed: Array<{ original_text: string; error: string }>
    stats: {
      total: number
      resolved: number
      failed: number
      cached: number
      ai_resolved: number
    }
  }>> {
    const results = {
      resolved: [] as Array<VendorResolutionResponse['data']>,
      failed: [] as Array<{ original_text: string; error: string }>,
      stats: {
        total: requests.length,
        resolved: 0,
        failed: 0,
        cached: 0,
        ai_resolved: 0
      }
    }

    for (const request of requests) {
      try {
        const result = await this.resolveVendor(request, userId)
        
        if (result.success && result.data) {
          results.resolved.push(result.data)
          results.stats.resolved++
          
          if (result.data.source === 'user') {
            results.stats.cached++
          } else if (result.data.source === 'llm') {
            results.stats.ai_resolved++
          }
        } else {
          results.failed.push({
            original_text: request.original_text,
            error: result.error?.message || 'Unknown error'
          })
          results.stats.failed++
        }
      } catch (error) {
        results.failed.push({
          original_text: request.original_text,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        results.stats.failed++
      }
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return {
      success: true,
      data: results,
      meta: {
        total_count: results.stats.total,
        resolved_count: results.stats.resolved,
        cache_hit_rate: results.stats.cached / Math.max(1, results.stats.total)
      }
    }
  }
}