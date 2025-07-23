import type { Database } from './database'

// Vendor mapping types from database
export type VendorMapping = Database['public']['Tables']['vendor_mappings']['Row']
export type VendorMappingInsert = Database['public']['Tables']['vendor_mappings']['Insert']
export type VendorMappingUpdate = Database['public']['Tables']['vendor_mappings']['Update']

// Vendor resolution request/response types
export interface VendorResolutionRequest {
  original_text: string
  transaction_id?: string
  context?: {
    amount?: string
    date?: string
    bank_name?: string
  }
}

export interface VendorResolutionResponse {
  success: boolean
  data?: {
    original_text: string
    resolved_name: string
    confidence: number
    source: 'llm' | 'user' | 'google'
    sources?: GroundingSource[]
    reasoning?: string
  }
  error?: {
    code: string
    message: string
  }
}

export interface BulkVendorResolutionRequest {
  vendor_texts: VendorResolutionRequest[]
}

export interface BulkVendorResolutionResponse {
  success: boolean
  data?: {
    resolved: VendorResolutionResponse['data'][]
    failed: Array<{
      original_text: string
      error: string
    }>
    stats: {
      total: number
      resolved: number
      failed: number
      cached: number
      ai_resolved: number
    }
  }
  error?: {
    code: string
    message: string
  }
}

// Grounding and AI response types
export interface GroundingSource {
  title: string
  snippet: string
  url: string
  publish_date?: string
}

export interface GeminiGroundingResponse {
  text: string
  groundingMetadata?: {
    groundingChunks?: Array<{
      web?: {
        title?: string
        uri?: string
      }
    }>
    groundingSupports?: Array<{
      segment?: {
        startIndex?: number
        endIndex?: number
      }
      groundingChunkIndices?: number[]
      confidenceScores?: number[]
    }>
  }
}

// Confidence scoring enums
export enum VendorConfidenceLevel {
  HIGH = 'high',     // 80-100% confidence
  MEDIUM = 'medium', // 50-79% confidence  
  LOW = 'low'        // 0-49% confidence
}

export enum VendorResolutionSource {
  LLM = 'llm',
  USER = 'user', 
  GOOGLE = 'google'
}

// Vendor management types
export interface VendorMappingWithStats extends VendorMapping {
  usage_count?: number
  last_used?: string
}

export interface VendorSuggestion {
  suggested_name: string
  confidence: number
  source: VendorResolutionSource
  reasoning?: string
  sources?: GroundingSource[]
}

// API response standards (following .cursorrules)
export interface VendorAPISuccess<T> {
  success: true
  data: T
  meta?: {
    total_count?: number
    resolved_count?: number
    cache_hit_rate?: number
  }
}

export interface VendorAPIError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type VendorAPIResponse<T> = VendorAPISuccess<T> | VendorAPIError