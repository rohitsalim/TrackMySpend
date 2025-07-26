import { createClient } from '@/lib/supabase/server'

/**
 * Category Mapping for caching vendor -> category assignments
 */
interface CategoryMappingRecord {
  id: string
  vendor_name: string
  category_id: string
  category_name: string
  user_id: string | null
  confidence: number | null
  source: 'user' | 'pattern' | 'llm'
  created_at: string
}

interface CategoryMappingInsert {
  vendor_name: string
  category_id: string
  category_name: string
  user_id?: string | null
  confidence?: number | null
  source: 'user' | 'pattern' | 'llm'
}

/**
 * Category Mapping Cache Service
 * 
 * Caches vendor name to category mappings for fast lookup
 * Similar to vendor-mapping-cache but for categories
 */
export class CategoryMappingCache {
  private supabase: Awaited<ReturnType<typeof createClient>>

  constructor(supabaseClient: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabaseClient
  }

  /**
   * Get the best category mapping for a vendor
   * Priority: User mapping > High confidence global > Any global
   */
  async getBestMapping(
    vendorName: string,
    userId?: string
  ): Promise<CategoryMappingRecord | null> {
    try {
      const normalizedVendor = this.normalizeVendorName(vendorName)

      // Build query to get all potential mappings
      const query = this.supabase
        .from('category_mappings')
        .select('*')
        .eq('vendor_name', normalizedVendor)
        .order('confidence', { ascending: false })

      const { data: mappings, error } = await query
      
      if (error || !mappings || mappings.length === 0) {
        return null
      }

      // Priority-based selection
      // 1. User-specific mapping (if userId provided)
      if (userId) {
        const userMapping = mappings.find(m => m.user_id === userId)
        if (userMapping) return userMapping
      }

      // 2. High confidence global mapping (>= 0.8)
      const highConfidenceGlobal = mappings.find(
        m => m.user_id === null && (m.confidence ?? 0) >= 0.8
      )
      if (highConfidenceGlobal) return highConfidenceGlobal

      // 3. Any global mapping (community intelligence)
      const globalMapping = mappings.find(m => m.user_id === null)
      if (globalMapping) return globalMapping

      // 4. Highest confidence mapping from any user
      return mappings[0] // Already sorted by confidence DESC

    } catch (error) {
      console.error('Error retrieving category mapping:', error)
      return null
    }
  }

  /**
   * Cache a new category mapping
   */
  async cacheMapping(
    vendorName: string,
    categoryId: string,
    categoryName: string,
    confidence: number,
    source: 'user' | 'pattern' | 'llm',
    userId?: string
  ): Promise<CategoryMappingRecord | null> {
    try {
      const normalizedVendor = this.normalizeVendorName(vendorName)

      // Check for existing mapping
      const existingMapping = await this.getBestMapping(normalizedVendor, userId)
      
      if (existingMapping) {
        // Update if new confidence is significantly higher or user override
        const shouldUpdate = 
          confidence > (existingMapping.confidence ?? 0) + 0.1 ||
          (source === 'user' && existingMapping.source !== 'user')

        if (shouldUpdate) {
          return await this.updateMapping(existingMapping.id, {
            category_id: categoryId,
            category_name: categoryName,
            confidence,
            source
          })
        }

        return existingMapping
      }

      // Create new mapping
      const newMapping: CategoryMappingInsert = {
        vendor_name: normalizedVendor,
        category_id: categoryId,
        category_name: categoryName,
        confidence: Math.min(1.0, Math.max(0.0, confidence)),
        source,
        user_id: source === 'user' ? userId : null
      }

      const { data: mapping, error } = await this.supabase
        .from('category_mappings')
        .insert(newMapping)
        .select()
        .single()

      if (error) {
        console.error('Error caching category mapping:', error)
        return null
      }

      return mapping

    } catch (error) {
      console.error('Error caching category mapping:', error)
      return null
    }
  }

  /**
   * Update an existing category mapping
   */
  private async updateMapping(
    mappingId: string,
    updates: {
      category_id?: string
      category_name?: string
      confidence?: number
      source?: string
    }
  ): Promise<CategoryMappingRecord | null> {
    try {
      const { data: mapping, error } = await this.supabase
        .from('category_mappings')
        .update(updates)
        .eq('id', mappingId)
        .select()
        .single()

      if (error) {
        console.error('Error updating category mapping:', error)
        return null
      }

      return mapping

    } catch (error) {
      console.error('Error updating category mapping:', error)
      return null
    }
  }

  /**
   * Learn from user category correction
   */
  async learnFromUserCorrection(
    vendorName: string,
    categoryId: string,
    categoryName: string,
    userId: string
  ): Promise<void> {
    try {
      // Create high-confidence user mapping
      await this.cacheMapping(
        vendorName,
        categoryId,
        categoryName,
        0.95, // High confidence for user corrections
        'user',
        userId
      )

      // Check if this vendor has multiple user corrections pointing to same category
      const similarMappings = await this.findSimilarMappings(vendorName)
      
      if (similarMappings.length >= 3) { // If 3+ users agree
        const consensusCategory = this.findConsensusCategory(similarMappings)
        if (consensusCategory && consensusCategory.categoryId === categoryId) {
          // Promote to global mapping
          await this.cacheMapping(
            vendorName,
            categoryId,
            categoryName,
            0.85, // High confidence for consensus
            'pattern',
            undefined // Global mapping
          )
        }
      }

    } catch (error) {
      console.error('Error learning from user correction:', error)
    }
  }

  /**
   * Find similar category mappings for consensus building
   */
  private async findSimilarMappings(vendorName: string): Promise<CategoryMappingRecord[]> {
    try {
      // Implementation will be added after database table creation
      return []

    } catch (error) {
      console.error('Error finding similar mappings:', error)
      return []
    }
  }

  /**
   * Find consensus category from multiple mappings
   */
  private findConsensusCategory(mappings: CategoryMappingRecord[]): { categoryId: string; categoryName: string } | null {
    const categoryCount = new Map<string, { name: string; count: number }>()
    
    mappings.forEach(mapping => {
      const existing = categoryCount.get(mapping.category_id)
      if (existing) {
        existing.count++
      } else {
        categoryCount.set(mapping.category_id, {
          name: mapping.category_name,
          count: 1
        })
      }
    })

    // Return the most common category
    let maxCount = 0
    let consensusCategory = null
    
    for (const [categoryId, { name, count }] of categoryCount.entries()) {
      if (count > maxCount) {
        maxCount = count
        consensusCategory = { categoryId, categoryName: name }
      }
    }

    return consensusCategory
  }

  /**
   * Normalize vendor name for consistent matching
   */
  private normalizeVendorName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '') // Remove special characters
  }

  /**
   * Get mapping statistics
   */
  async getMappingStats(userId?: string): Promise<{
    total_mappings: number
    user_mappings: number
    global_mappings: number
    high_confidence_mappings: number
  }> {
    try {
      // Implementation will be added after database table creation
      return {
        total_mappings: 0,
        user_mappings: 0,
        global_mappings: 0,
        high_confidence_mappings: 0
      }

    } catch (error) {
      console.error('Error getting mapping stats:', error)
      return {
        total_mappings: 0,
        user_mappings: 0,
        global_mappings: 0,
        high_confidence_mappings: 0
      }
    }
  }

  /**
   * Clean up old mappings (maintenance function)
   */
  async cleanupMappings(): Promise<{ deleted: number }> {
    try {
      // Implementation will be added after database table creation
      return { deleted: 0 }

    } catch (error) {
      console.error('Error cleaning up mappings:', error)
      return { deleted: 0 }
    }
  }
}