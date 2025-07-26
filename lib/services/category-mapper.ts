import { createClient } from '@/lib/supabase/server'
import { getVendorDatabase } from '@/lib/services/vendor-database'
import type { Database } from '@/types/database'

type Category = Database['public']['Tables']['categories']['Row']

export interface CategoryMapping {
  csvCategory: string
  csvSubcategory?: string
  systemCategoryName: string
  confidence: number
}

export interface CategoryMatch {
  categoryId: string
  categoryName: string
  confidence: number
  source: 'csv' | 'pattern' | 'user'
  reasoning?: string
}

/**
 * Category Mapper Service
 * 
 * Maps vendor categories from CSV to system categories
 * and provides intelligent category suggestions based on vendor data
 */
export class CategoryMapper {
  private supabase: Awaited<ReturnType<typeof createClient>>
  private vendorDatabase = getVendorDatabase()
  private systemCategories: Category[] = []
  private categoryMappings: Map<string, string> = new Map()

  constructor(supabaseClient: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabaseClient
    this.initializeMappings()
  }

  /**
   * Initialize category mappings from CSV categories to system categories
   */
  private initializeMappings(): void {
    // E-commerce mappings
    this.categoryMappings.set('e-commerce', 'Shopping')
    this.categoryMappings.set('e-commerce:fashion', 'Shopping')
    this.categoryMappings.set('e-commerce:electronics', 'Shopping')
    this.categoryMappings.set('e-commerce:furniture', 'Shopping')
    this.categoryMappings.set('e-commerce:beauty', 'Personal Care')
    this.categoryMappings.set('e-commerce:baby products', 'Shopping')
    
    // Food & Dining mappings
    this.categoryMappings.set('food delivery', 'Food & Dining')
    this.categoryMappings.set('food delivery:restaurant', 'Food & Dining')
    this.categoryMappings.set('food delivery:major platform', 'Food & Dining')
    
    // Transportation mappings
    this.categoryMappings.set('transportation', 'Transportation')
    this.categoryMappings.set('transportation:ride-hailing', 'Transportation')
    this.categoryMappings.set('transportation:bike taxi', 'Transportation')
    this.categoryMappings.set('transportation:car rental', 'Transportation')
    this.categoryMappings.set('transportation:bike sharing', 'Transportation')
    
    // Healthcare mappings
    this.categoryMappings.set('healthcare', 'Healthcare')
    this.categoryMappings.set('healthcare:online pharmacy', 'Healthcare')
    this.categoryMappings.set('healthcare:diagnostics', 'Healthcare')
    this.categoryMappings.set('healthcare:telemedicine', 'Healthcare')
    this.categoryMappings.set('healthcare:fitness', 'Healthcare')
    
    // Education mappings
    this.categoryMappings.set('edtech', 'Education')
    this.categoryMappings.set('edtech:k-12 education', 'Education')
    this.categoryMappings.set('edtech:test prep', 'Education')
    this.categoryMappings.set('edtech:professional courses', 'Education')
    
    // Financial services mappings
    this.categoryMappings.set('fintech', 'Bills & Utilities')
    this.categoryMappings.set('fintech:digital wallet', 'Bills & Utilities')
    this.categoryMappings.set('fintech:payment gateway', 'Bills & Utilities')
    this.categoryMappings.set('fintech:credit management', 'Bills & Utilities')
    
    // Retail mappings
    this.categoryMappings.set('retail', 'Shopping')
    this.categoryMappings.set('retail:supermarket', 'Shopping')
    this.categoryMappings.set('retail:hypermarket', 'Shopping')
    this.categoryMappings.set('retail:electronics', 'Shopping')
    
    // Telecom mappings
    this.categoryMappings.set('telecom', 'Bills & Utilities')
    this.categoryMappings.set('telecom:mobile operator', 'Bills & Utilities')
    
    // Entertainment mappings
    this.categoryMappings.set('entertainment', 'Entertainment')
    this.categoryMappings.set('streaming', 'Entertainment')
    this.categoryMappings.set('gaming', 'Entertainment')
    
    // Travel mappings
    this.categoryMappings.set('travel', 'Travel')
    this.categoryMappings.set('hospitality', 'Travel')
    this.categoryMappings.set('airlines', 'Travel')
  }

  /**
   * Load system categories from database
   */
  async loadSystemCategories(): Promise<void> {
    try {
      const { data: categories, error } = await this.supabase
        .from('categories')
        .select('*')
        .eq('is_system', true)
        .order('name')

      if (error) throw error
      this.systemCategories = categories || []
    } catch (error) {
      console.error('Failed to load system categories:', error)
      this.systemCategories = []
    }
  }

  /**
   * Get category suggestion based on vendor name
   */
  async getCategorySuggestion(vendorName: string): Promise<CategoryMatch | null> {
    // Ensure categories are loaded
    if (this.systemCategories.length === 0) {
      await this.loadSystemCategories()
    }

    // Step 1: Look up vendor in CSV database
    const vendorMatch = this.vendorDatabase.findVendor(vendorName)
    if (vendorMatch) {
      // Get the vendor details from database
      const vendors = this.vendorDatabase.getRelevantVendorsForContext(vendorName, 1)
      if (vendors.length > 0) {
        const vendor = vendors[0]
        const mappingKey = vendor.subcategory 
          ? `${vendor.category.toLowerCase()}:${vendor.subcategory.toLowerCase()}`
          : vendor.category.toLowerCase()
        
        const systemCategoryName = this.categoryMappings.get(mappingKey) || 
                                  this.categoryMappings.get(vendor.category.toLowerCase())
        
        if (systemCategoryName) {
          const systemCategory = this.systemCategories.find(
            cat => cat.name === systemCategoryName
          )
          
          if (systemCategory) {
            return {
              categoryId: systemCategory.id,
              categoryName: systemCategory.name,
              confidence: 0.95, // High confidence for CSV matches
              source: 'csv',
              reasoning: `Matched vendor "${vendorMatch.brand}" in ${vendor.category} category`
            }
          }
        }
      }
    }

    // Step 2: Try pattern-based matching (will be implemented in transaction-categorizer)
    return null
  }

  /**
   * Get category suggestions for multiple vendors
   */
  async getBulkCategorySuggestions(
    vendorNames: string[]
  ): Promise<Map<string, CategoryMatch | null>> {
    const results = new Map<string, CategoryMatch | null>()
    
    // Process in batches to avoid overwhelming the system
    for (const vendorName of vendorNames) {
      const suggestion = await this.getCategorySuggestion(vendorName)
      results.set(vendorName, suggestion)
    }
    
    return results
  }

  /**
   * Get all system categories for UI display
   */
  async getSystemCategories(): Promise<Category[]> {
    if (this.systemCategories.length === 0) {
      await this.loadSystemCategories()
    }
    return this.systemCategories
  }

  /**
   * Map a CSV category/subcategory to system category
   */
  mapCsvToSystemCategory(csvCategory: string, csvSubcategory?: string): string | null {
    const key = csvSubcategory 
      ? `${csvCategory.toLowerCase()}:${csvSubcategory.toLowerCase()}`
      : csvCategory.toLowerCase()
    
    return this.categoryMappings.get(key) || 
           this.categoryMappings.get(csvCategory.toLowerCase()) || 
           null
  }
}