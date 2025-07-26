import { google } from '@ai-sdk/google'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { CategoryMapper, type CategoryMatch } from '@/lib/services/category-mapper'
import { CategoryMappingCache } from '@/lib/services/category-mapping-cache'
import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Category = Database['public']['Tables']['categories']['Row']

export interface CategorizationRequest {
  transactionId: string
  vendorName: string
  amount: number
  transactionType: 'DEBIT' | 'CREDIT'
  description?: string
  transactionDate?: string
  userId?: string
}

export interface CategorizationResponse {
  success: boolean
  data?: CategoryMatch
  error?: {
    code: string
    message: string
  }
}

/**
 * Transaction Categorizer Service
 * 
 * Intelligently categorizes transactions using:
 * 1. Vendor database mappings
 * 2. Pattern-based rules
 * 3. LLM-based categorization
 * 4. User preference learning
 */
export class TransactionCategorizer {
  private supabase: Awaited<ReturnType<typeof createClient>>
  private categoryMapper: CategoryMapper
  private cache: CategoryMappingCache
  private systemCategories: Category[] = []

  constructor(supabaseClient: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabaseClient
    this.categoryMapper = new CategoryMapper(supabaseClient)
    this.cache = new CategoryMappingCache(supabaseClient)
  }

  /**
   * Categorize a single transaction
   */
  async categorizeTransaction(
    request: CategorizationRequest
  ): Promise<CategorizationResponse> {
    try {
      const { vendorName, amount, transactionType, description, userId } = request

      // Step 1: Check cache for user preferences
      const cachedCategory = await this.cache.getBestMapping(vendorName, userId)
      if (cachedCategory) {
        return {
          success: true,
          data: {
            categoryId: cachedCategory.category_id,
            categoryName: cachedCategory.category_name,
            confidence: cachedCategory.confidence ?? 0.9,
            source: cachedCategory.user_id ? 'user' : 'pattern',
            reasoning: `Found in ${cachedCategory.user_id ? 'user' : 'cached'} category mappings`
          }
        }
      }

      // Step 2: Try vendor database mapping
      const vendorCategory = await this.categoryMapper.getCategorySuggestion(vendorName)
      if (vendorCategory) {
        // Cache the result
        await this.cache.cacheMapping(
          vendorName,
          vendorCategory.categoryId,
          vendorCategory.categoryName,
          vendorCategory.confidence,
          'pattern'
        )
        return { success: true, data: vendorCategory }
      }

      // Step 3: Apply pattern-based rules
      const patternCategory = await this.applyPatternRules(
        vendorName,
        amount,
        transactionType,
        description
      )
      if (patternCategory) {
        // Cache the result
        await this.cache.cacheMapping(
          vendorName,
          patternCategory.categoryId,
          patternCategory.categoryName,
          patternCategory.confidence,
          'pattern'
        )
        return { success: true, data: patternCategory }
      }

      // Step 4: Use LLM for categorization
      const llmCategory = await this.categorizWithLLM(request)
      if (llmCategory) {
        // Cache the result
        await this.cache.cacheMapping(
          vendorName,
          llmCategory.categoryId,
          llmCategory.categoryName,
          llmCategory.confidence,
          'pattern'
        )
        return { success: true, data: llmCategory }
      }

      // No category found
      return {
        success: false,
        error: {
          code: 'NO_CATEGORY_FOUND',
          message: 'Unable to determine category for this transaction'
        }
      }

    } catch (error) {
      console.error('Categorization error:', error)
      return {
        success: false,
        error: {
          code: 'CATEGORIZATION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }
  }

  /**
   * Apply pattern-based categorization rules
   */
  private async applyPatternRules(
    vendorName: string,
    amount: number,
    transactionType: 'DEBIT' | 'CREDIT',
    description?: string
  ): Promise<CategoryMatch | null> {
    await this.loadSystemCategories()
    
    const text = `${vendorName} ${description || ''}`.toLowerCase()
    
    // Transportation patterns
    if (/petrol|fuel|diesel|bp|hp|ioc|bpcl|hpcl|indian oil/i.test(text)) {
      return this.createCategoryMatch('Transportation', 0.95, 'pattern', 'Fuel/Petrol keyword detected')
    }
    
    if (/uber|ola|rapido|taxi|cab|auto/i.test(text) && amount >= 20 && amount <= 1000) {
      return this.createCategoryMatch('Transportation', 0.9, 'pattern', 'Ride-hailing service detected')
    }
    
    // Healthcare patterns
    if (/hospital|clinic|pharmacy|medical|doctor|diagnostic|lab|apollo|fortis|medplus|netmeds/i.test(text)) {
      return this.createCategoryMatch('Healthcare', 0.95, 'pattern', 'Healthcare keyword detected')
    }
    
    // Food & Dining patterns
    if (/restaurant|cafe|hotel|food|pizza|burger|biryani|kitchen|dhaba/i.test(text)) {
      return this.createCategoryMatch('Food & Dining', 0.85, 'pattern', 'Food/Restaurant keyword detected')
    }
    
    // Bills & Utilities patterns
    if (/electricity|water|gas|internet|broadband|mobile|recharge|bill|jio|airtel|vodafone|bsnl/i.test(text)) {
      return this.createCategoryMatch('Bills & Utilities', 0.9, 'pattern', 'Utility bill keyword detected')
    }
    
    // Education patterns
    if (/school|college|university|education|tuition|fees|course|training/i.test(text)) {
      return this.createCategoryMatch('Education', 0.9, 'pattern', 'Education keyword detected')
    }
    
    // Entertainment patterns
    if (/movie|cinema|pvr|inox|netflix|hotstar|spotify|game|bowling/i.test(text)) {
      return this.createCategoryMatch('Entertainment', 0.85, 'pattern', 'Entertainment keyword detected')
    }
    
    // Shopping patterns (for specific amounts)
    if (transactionType === 'DEBIT' && amount > 500 && /mall|store|mart|bazaar|market/i.test(text)) {
      return this.createCategoryMatch('Shopping', 0.8, 'pattern', 'Shopping location detected')
    }
    
    // ATM/Transfer patterns
    if (/atm|withdrawal|transfer|neft|imps|rtgs/i.test(text)) {
      return this.createCategoryMatch('Other', 0.7, 'pattern', 'ATM/Transfer transaction detected')
    }
    
    // Rent pattern (large monthly amounts)
    if (amount >= 5000 && /rent|lease|landlord|society|maintenance/i.test(text)) {
      return this.createCategoryMatch('Rent', 0.85, 'pattern', 'Rent payment detected')
    }
    
    // Insurance pattern
    if (/insurance|lic|policy|premium|icici lombard|hdfc ergo|bajaj allianz/i.test(text)) {
      return this.createCategoryMatch('Insurance', 0.9, 'pattern', 'Insurance keyword detected')
    }
    
    // Investment pattern
    if (/mutual fund|sip|stock|trading|zerodha|groww|upstox|investment/i.test(text)) {
      return this.createCategoryMatch('Investments', 0.9, 'pattern', 'Investment keyword detected')
    }

    return null
  }

  /**
   * Use LLM for intelligent categorization
   */
  private async categorizWithLLM(
    request: CategorizationRequest
  ): Promise<CategoryMatch | null> {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return null
    }

    try {
      await this.loadSystemCategories()
      
      const prompt = this.buildCategorizationPrompt(request)
      
      const response = await generateText({
        model: google('gemini-2.5-pro', {
          useSearchGrounding: true,
        }),
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 8192
            }
          }
        },
        prompt,
        temperature: 0.2,
      })

      const parsedResult = this.parseLLMResponse(response.text)
      return parsedResult

    } catch (error) {
      console.error('LLM categorization error:', error)
      return null
    }
  }

  /**
   * Build prompt for LLM categorization
   */
  private buildCategorizationPrompt(request: CategorizationRequest): string {
    const categories = this.systemCategories.map(cat => cat.name).join(', ')
    
    return `You are a financial transaction categorization expert specializing in Indian transactions.

Available Categories: ${categories}

Transaction Details:
- Vendor: ${request.vendorName}
- Amount: ₹${request.amount}
- Type: ${request.transactionType}
- Description: ${request.description || 'N/A'}
- Date: ${request.transactionDate || 'N/A'}

Task: Categorize this transaction into the MOST appropriate category from the available list.

Consider:
1. Vendor type and business category
2. Transaction amount patterns
3. Common Indian spending patterns
4. If unclear, prefer "Other" category

Response format:
Category: [Selected Category Name]
Confidence: [0.0-1.0]
Reasoning: [Brief explanation]`
  }

  /**
   * Parse LLM response
   */
  private parseLLMResponse(text: string): CategoryMatch | null {
    try {
      const categoryMatch = text.match(/Category:\s*([^\n]+)/i)
      const confidenceMatch = text.match(/Confidence:\s*([0-9.]+)/i)
      const reasoningMatch = text.match(/Reasoning:\s*([^\n]+)/i)

      if (!categoryMatch) return null

      const categoryName = categoryMatch[1].trim()
      const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7
      const reasoning = reasoningMatch?.[1]?.trim() || 'LLM-based categorization'

      const category = this.systemCategories.find(
        cat => cat.name.toLowerCase() === categoryName.toLowerCase()
      )

      if (!category) return null

      return {
        categoryId: category.id,
        categoryName: category.name,
        confidence: Math.min(0.9, Math.max(0.5, confidence)),
        source: 'pattern',
        reasoning
      }

    } catch (error) {
      console.error('Failed to parse LLM response:', error)
      return null
    }
  }

  /**
   * Create category match helper
   */
  private createCategoryMatch(
    categoryName: string,
    confidence: number,
    source: 'csv' | 'pattern' | 'user',
    reasoning: string
  ): CategoryMatch | null {
    const category = this.systemCategories.find(cat => cat.name === categoryName)
    if (!category) return null

    return {
      categoryId: category.id,
      categoryName: category.name,
      confidence,
      source,
      reasoning
    }
  }

  /**
   * Load system categories
   */
  private async loadSystemCategories(): Promise<void> {
    if (this.systemCategories.length > 0) return

    const categories = await this.categoryMapper.getSystemCategories()
    this.systemCategories = categories
  }

  /**
   * Learn from user correction
   */
  async learnFromUserCorrection(
    vendorName: string,
    categoryId: string,
    categoryName: string,
    userId: string
  ): Promise<void> {
    await this.cache.learnFromUserCorrection(
      vendorName,
      categoryId,
      categoryName,
      userId
    )
  }
}