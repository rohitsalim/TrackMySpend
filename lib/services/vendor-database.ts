import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Vendor Database Service
 * 
 * Loads and searches the local CSV database of Indian brands and their transaction descriptors.
 * Provides fast, accurate vendor name resolution without requiring API calls.
 */

interface VendorRecord {
  brand: string;
  category: string;
  subcategory: string;
  transactionDescriptors: string[];
  registeredCompanyName: string;
}

interface VendorMatch {
  brand: string;
  confidence: number;
  category: string;
  matchedDescriptor?: string;
}

export class VendorDatabase {
  private vendors: VendorRecord[] = [];
  private descriptorIndex: Map<string, VendorRecord> = new Map();
  private loaded = false;

  constructor(csvPath?: string) {
    this.loadDatabase(csvPath);
  }

  /**
   * Load CSV database into memory on initialization
   */
  private loadDatabase(csvPath?: string): void {
    try {
      // Use provided path or default to public folder
      const filePath = csvPath || join(process.cwd(), 'public', 'vendors', 'indian-brands-transaction-descriptors.csv');
      const csvContent = readFileSync(filePath, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
      }) as Array<{
        Brand: string;
        Category: string;
        Subcategory: string;
        Transaction_Descriptor: string;
        Registered_Company_Name: string;
      }>;

      // Process each record
      for (const record of records) {
        const vendorRecord: VendorRecord = {
          brand: record.Brand,
          category: record.Category,
          subcategory: record.Subcategory,
          transactionDescriptors: this.parseDescriptors(record.Transaction_Descriptor),
          registeredCompanyName: record.Registered_Company_Name,
        };

        this.vendors.push(vendorRecord);

        // Index each descriptor for fast lookup
        for (const descriptor of vendorRecord.transactionDescriptors) {
          this.descriptorIndex.set(descriptor.toLowerCase(), vendorRecord);
        }
      }

      this.loaded = true;
      console.log(`Loaded ${this.vendors.length} vendor records with ${this.descriptorIndex.size} descriptors`);
    } catch (error) {
      console.error('Failed to load vendor database:', error);
      // Continue without CSV database - fall back to LLM
      this.loaded = false;
    }
  }

  /**
   * Parse comma-separated descriptors into array
   */
  private parseDescriptors(descriptorString: string): string[] {
    return descriptorString
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
  }

  /**
   * Find vendor by exact or fuzzy match
   */
  findVendor(transactionText: string): VendorMatch | null {
    if (!this.loaded) return null;

    const normalizedText = this.normalizeText(transactionText);

    // Step 1: Try exact descriptor match
    const exactMatch = this.findExactMatch(normalizedText);
    if (exactMatch) return exactMatch;

    // Step 2: Try pattern matching (e.g., DMART*BANGALORE matches DMART*[LOCATION])
    const patternMatch = this.findPatternMatch(normalizedText);
    if (patternMatch) return patternMatch;

    // Step 3: Try fuzzy matching
    const fuzzyMatch = this.findFuzzyMatch(normalizedText);
    if (fuzzyMatch) return fuzzyMatch;

    return null;
  }

  /**
   * Find exact match in descriptor index
   */
  private findExactMatch(normalizedText: string): VendorMatch | null {
    // Check if entire text matches a descriptor
    const vendor = this.descriptorIndex.get(normalizedText);
    if (vendor) {
      return {
        brand: vendor.brand,
        confidence: 0.98,
        category: vendor.category,
        matchedDescriptor: normalizedText,
      };
    }

    // Check if text starts with any descriptor
    for (const [descriptor, vendor] of this.descriptorIndex) {
      if (normalizedText.startsWith(descriptor)) {
        return {
          brand: vendor.brand,
          confidence: 0.95,
          category: vendor.category,
          matchedDescriptor: descriptor,
        };
      }
    }

    return null;
  }

  /**
   * Find match using patterns like DMART*[LOCATION]
   */
  private findPatternMatch(normalizedText: string): VendorMatch | null {
    // Extract base pattern (e.g., "DMART*BANGALORE" -> "DMART")
    const basePattern = normalizedText.split('*')[0];
    
    if (basePattern) {
      for (const vendor of this.vendors) {
        for (const descriptor of vendor.transactionDescriptors) {
          // Check if descriptor contains pattern placeholder
          if (descriptor.includes('[LOCATION]') || descriptor.includes('[CITY]')) {
            const descriptorBase = descriptor.split('*')[0];
            if (descriptorBase.toLowerCase() === basePattern.toLowerCase()) {
              return {
                brand: vendor.brand,
                confidence: 0.93,
                category: vendor.category,
                matchedDescriptor: descriptor,
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Find fuzzy match using token overlap
   */
  private findFuzzyMatch(normalizedText: string): VendorMatch | null {
    const textTokens = this.tokenize(normalizedText);
    let bestMatch: VendorMatch | null = null;
    let bestScore = 0;

    for (const vendor of this.vendors) {
      // Check against each descriptor
      for (const descriptor of vendor.transactionDescriptors) {
        const descriptorTokens = this.tokenize(descriptor.toLowerCase());
        const score = this.calculateTokenOverlap(textTokens, descriptorTokens);

        if (score > bestScore && score >= 0.7) {
          bestScore = score;
          bestMatch = {
            brand: vendor.brand,
            confidence: Math.min(0.9, score),
            category: vendor.category,
            matchedDescriptor: descriptor,
          };
        }
      }

      // Also check against company name
      const companyTokens = this.tokenize(vendor.registeredCompanyName.toLowerCase());
      const companyScore = this.calculateTokenOverlap(textTokens, companyTokens);
      
      if (companyScore > bestScore && companyScore >= 0.7) {
        bestScore = companyScore;
        bestMatch = {
          brand: vendor.brand,
          confidence: Math.min(0.85, companyScore),
          category: vendor.category,
          matchedDescriptor: vendor.registeredCompanyName,
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get relevant vendors for LLM context
   */
  getRelevantVendorsForContext(transactionText: string, limit: number = 10): VendorRecord[] {
    if (!this.loaded) return [];

    const normalizedText = this.normalizeText(transactionText);
    const textTokens = this.tokenize(normalizedText);
    
    // Score all vendors
    const scoredVendors = this.vendors.map(vendor => {
      let maxScore = 0;

      // Score against descriptors
      for (const descriptor of vendor.transactionDescriptors) {
        const descriptorTokens = this.tokenize(descriptor.toLowerCase());
        const score = this.calculateTokenOverlap(textTokens, descriptorTokens);
        maxScore = Math.max(maxScore, score);
      }

      // Score against company name
      const companyTokens = this.tokenize(vendor.registeredCompanyName.toLowerCase());
      const companyScore = this.calculateTokenOverlap(textTokens, companyTokens);
      maxScore = Math.max(maxScore, companyScore);

      return { vendor, score: maxScore };
    });

    // Sort by score and return top matches
    return scoredVendors
      .filter(sv => sv.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(sv => sv.vendor);
  }

  /**
   * Normalize text for matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9*\s]/g, '') // Keep alphanumeric, asterisks, and spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): Set<string> {
    return new Set(
      text
        .split(/[\s*]+/)
        .filter(token => token.length > 2) // Ignore very short tokens
    );
  }

  /**
   * Calculate token overlap score (Jaccard similarity)
   */
  private calculateTokenOverlap(tokens1: Set<string>, tokens2: Set<string>): number {
    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Get statistics about the loaded database
   */
  getStats(): { loaded: boolean; vendorCount: number; descriptorCount: number } {
    return {
      loaded: this.loaded,
      vendorCount: this.vendors.length,
      descriptorCount: this.descriptorIndex.size,
    };
  }
}

// Singleton instance
let vendorDatabase: VendorDatabase | null = null;

export function getVendorDatabase(): VendorDatabase {
  if (!vendorDatabase) {
    vendorDatabase = new VendorDatabase();
  }
  return vendorDatabase;
}