import { createClient } from '@/lib/supabase/server'
import type { 
  VendorMapping,
  VendorMappingInsert
} from '@/types/vendor-resolution'

/**
 * Vendor Mapping Cache Service
 * 
 * Handles intelligent caching and shared learning for vendor mappings
 * Implements a multi-tier cache system:
 * 1. User-specific mappings (highest priority)
 * 2. Global shared mappings (community intelligence)
 * 3. Confidence-based fallbacks
 * 
 * Following .cursorrules for financial data handling and caching strategies
 */
export class VendorMappingCache {
  private supabase: Awaited<ReturnType<typeof createClient>>

  constructor(supabaseClient: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabaseClient
  }

  /**
   * Get the best vendor mapping for a given text
   * Priority: User mapping > High confidence global > Any global
   */
  async getBestMapping(
    originalText: string, 
    userId?: string
  ): Promise<VendorMapping | null> {
    try {
      const normalizedText = this.normalizeVendorText(originalText)
      
      // Build query to get all potential mappings
      const query = this.supabase
        .from('vendor_mappings')
        .select('*')
        .eq('original_text', normalizedText)
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
      console.error('Error retrieving vendor mapping:', error)
      return null
    }
  }

  /**
   * Cache a new vendor mapping with intelligent deduplication
   */
  async cacheMapping(
    originalText: string,
    mappedName: string,
    confidence: number,
    source: 'llm' | 'user' | 'google',
    userId?: string
  ): Promise<VendorMapping | null> {
    try {
      const normalizedText = this.normalizeVendorText(originalText)
      const normalizedName = this.normalizeMappedName(mappedName)

      // Check for existing mappings to prevent duplicates
      const existingMapping = await this.getBestMapping(normalizedText, userId)
      
      if (existingMapping) {
        // Update if new confidence is significantly higher (>0.1 improvement)
        const confidenceImprovement = confidence - (existingMapping.confidence ?? 0)
        const shouldUpdate = confidenceImprovement > 0.1 || 
                           (source === 'user' && existingMapping.source !== 'user')

        if (shouldUpdate) {
          return await this.updateMapping(existingMapping.id, {
            mapped_name: normalizedName,
            confidence,
            source
          })
        }

        return existingMapping
      }

      // Create new mapping
      const newMapping: VendorMappingInsert = {
        original_text: normalizedText,
        mapped_name: normalizedName,
        confidence: Math.min(1.0, Math.max(0.0, confidence)), // Clamp 0-1
        source,
        user_id: source === 'user' ? userId : null // Global unless user override
      }

      const { data: mapping, error } = await this.supabase
        .from('vendor_mappings')
        .insert(newMapping)
        .select()
        .single()

      if (error) {
        console.error('Error caching vendor mapping:', error)
        return null
      }

      return mapping

    } catch (error) {
      console.error('Error caching vendor mapping:', error)
      return null
    }
  }

  /**
   * Update an existing vendor mapping
   */
  private async updateMapping(
    mappingId: string,
    updates: {
      mapped_name?: string
      confidence?: number
      source?: string
    }
  ): Promise<VendorMapping | null> {
    try {
      const { data: mapping, error } = await this.supabase
        .from('vendor_mappings')
        .update(updates)
        .eq('id', mappingId)
        .select()
        .single()

      if (error) {
        console.error('Error updating vendor mapping:', error)
        return null
      }

      return mapping

    } catch (error) {
      console.error('Error updating vendor mapping:', error)
      return null
    }
  }

  /**
   * Get mapping statistics for monitoring and analytics
   */
  async getMappingStats(userId?: string): Promise<{
    total_mappings: number
    user_mappings: number
    global_mappings: number
    high_confidence_mappings: number
    cache_effectiveness: number
  }> {
    try {
      // Get total mappings count
      const { count: totalCount } = await this.supabase
        .from('vendor_mappings')
        .select('*', { count: 'exact', head: true })

      // Get user-specific mappings count
      let userCount = 0
      if (userId) {
        const { count } = await this.supabase
          .from('vendor_mappings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        userCount = count || 0
      }

      // Get global mappings count
      const { count: globalCount } = await this.supabase
        .from('vendor_mappings')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)

      // Get high confidence mappings count (>= 0.8)
      const { count: highConfidenceCount } = await this.supabase
        .from('vendor_mappings')
        .select('*', { count: 'exact', head: true })
        .gte('confidence', 0.8)

      // Calculate cache effectiveness (high confidence + user overrides / total)
      const effectiveness = totalCount ? 
        ((highConfidenceCount || 0) + userCount) / totalCount : 0

      return {
        total_mappings: totalCount || 0,
        user_mappings: userCount,
        global_mappings: globalCount || 0,
        high_confidence_mappings: highConfidenceCount || 0,
        cache_effectiveness: effectiveness
      }

    } catch (error) {
      console.error('Error getting mapping stats:', error)
      return {
        total_mappings: 0,
        user_mappings: 0,
        global_mappings: 0,
        high_confidence_mappings: 0,
        cache_effectiveness: 0
      }
    }
  }

  /**
   * Learn from user corrections to improve global mappings
   */
  async learnFromUserCorrection(
    originalText: string,
    userCorrectedName: string,
    userId: string
  ): Promise<void> {
    try {
      // Create high-confidence user mapping
      await this.cacheMapping(
        originalText,
        userCorrectedName,
        0.95, // High confidence for user corrections
        'user',
        userId
      )

      // If this is a common pattern, potentially create/update global mapping
      const similarMappings = await this.findSimilarMappings(originalText)
      
      if (similarMappings.length >= 3) { // If 3+ users agree
        const consensusName = this.findConsensusName(similarMappings)
        if (consensusName === userCorrectedName) {
          // Promote to global mapping
          await this.cacheMapping(
            originalText,
            userCorrectedName,
            0.85, // High confidence for consensus
            'llm',
            undefined // Global mapping
          )
        }
      }

    } catch (error) {
      console.error('Error learning from user correction:', error)
    }
  }

  /**
   * Find similar vendor mappings for consensus building
   */
  private async findSimilarMappings(originalText: string): Promise<VendorMapping[]> {
    try {
      const normalizedText = this.normalizeVendorText(originalText)
      
      const { data: mappings } = await this.supabase
        .from('vendor_mappings')
        .select('*')
        .eq('original_text', normalizedText)
        .eq('source', 'user')

      return mappings || []

    } catch (error) {
      console.error('Error finding similar mappings:', error)
      return []
    }
  }

  /**
   * Find consensus name from multiple mappings
   */
  private findConsensusName(mappings: VendorMapping[]): string | null {
    const nameCount = new Map<string, number>()
    
    mappings.forEach(mapping => {
      const normalizedName = this.normalizeMappedName(mapping.mapped_name)
      nameCount.set(normalizedName, (nameCount.get(normalizedName) || 0) + 1)
    })

    // Return the most common name
    let maxCount = 0
    let consensusName = null
    
    for (const [name, count] of nameCount.entries()) {
      if (count > maxCount) {
        maxCount = count
        consensusName = name
      }
    }

    return consensusName
  }

  /**
   * Normalize vendor text for consistent matching
   * Following .cursorrules for data standardization
   */
  private normalizeVendorText(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s*]/g, '') // Keep only alphanumeric, spaces, and asterisks
  }

  /**
   * Normalize mapped vendor name for consistency
   */
  private normalizeMappedName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title case
      .join(' ')
  }

  /**
   * Cleanup old or low-quality mappings (maintenance function)
   */
  async cleanupMappings(): Promise<{ deleted: number }> {
    try {
      // Delete mappings with very low confidence (<0.3) that are older than 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count } = await this.supabase
        .from('vendor_mappings')
        .delete({ count: 'exact' })
        .lt('confidence', 0.3)
        .lt('created_at', thirtyDaysAgo.toISOString())
        .is('user_id', null) // Only cleanup global mappings, not user overrides

      return { deleted: count || 0 }

    } catch {
      return { deleted: 0 }
    }
  }
}