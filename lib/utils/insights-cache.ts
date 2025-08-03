import type { Database } from '@/types/database'

type Transaction = Database['public']['Tables']['transactions']['Row']
type Category = Database['public']['Tables']['categories']['Row']

export interface Insight {
  type: 'positive' | 'negative' | 'warning' | 'neutral'
  title: string
  description: string
  icon: 'trending-up' | 'trending-down' | 'alert-circle' | 'info'
}

export interface InsightsCacheData {
  insights: Insight[]
  metadata: {
    hash: string
    timestamp: number
    version: string
  }
}

const CACHE_KEY = 'tms_insights_cache'
const CACHE_VERSION = '1.0.0'
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds

/**
 * Generates a deterministic hash from transaction and category data
 * Hash changes when any insight-relevant data changes
 */
export function generateInsightsHash(
  transactions: Transaction[], 
  categories: Category[]
): string {
  // Create a string that represents the current state of insight-relevant data
  const transactionData = transactions
    .map(t => `${t.id}:${t.amount}:${t.transaction_date}:${t.category_id}:${t.vendor_name}:${t.type}`)
    .sort() // Sort for consistency
    .join('|')
  
  const categoryData = categories
    .map(c => `${c.id}:${c.name}:${c.parent_id}`)
    .sort()
    .join('|')
  
  const combinedData = `tx:${transactionData}|cat:${categoryData}`
  
  // Simple hash function (could use crypto.createHash in production)
  let hash = 0
  for (let i = 0; i < combinedData.length; i++) {
    const char = combinedData.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36)
}

/**
 * Saves insights to localStorage with metadata
 */
export function persistInsightsCache(
  insights: Insight[], 
  hash: string
): boolean {
  try {
    const cacheData: InsightsCacheData = {
      insights,
      metadata: {
        hash,
        timestamp: Date.now(),
        version: CACHE_VERSION
      }
    }
    
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
    return true
  } catch (error) {
    console.warn('Failed to persist insights cache:', error)
    return false
  }
}

/**
 * Loads insights from localStorage with validation
 */
export function loadInsightsCache(): InsightsCacheData | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const cacheData: InsightsCacheData = JSON.parse(cached)
    
    // Validate cache structure
    if (!cacheData.insights || !cacheData.metadata) {
      console.warn('Invalid cache structure, clearing cache')
      clearInsightsCache()
      return null
    }
    
    // Check version compatibility
    if (cacheData.metadata.version !== CACHE_VERSION) {
      console.info('Cache version mismatch, clearing cache')
      clearInsightsCache()
      return null
    }
    
    // Check cache age
    const age = Date.now() - cacheData.metadata.timestamp
    if (age > MAX_CACHE_AGE) {
      console.info('Cache expired, clearing cache')
      clearInsightsCache()
      return null
    }
    
    return cacheData
  } catch (error) {
    console.warn('Failed to load insights cache:', error)
    clearInsightsCache()
    return null
  }
}

/**
 * Clears insights cache from localStorage
 */
export function clearInsightsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (error) {
    console.warn('Failed to clear insights cache:', error)
  }
}

/**
 * Checks if cached insights are still valid for given data
 */
export function isCacheValid(
  transactions: Transaction[],
  categories: Category[],
  cachedData: InsightsCacheData | null
): boolean {
  if (!cachedData) return false
  
  const currentHash = generateInsightsHash(transactions, categories)
  return currentHash === cachedData.metadata.hash
}