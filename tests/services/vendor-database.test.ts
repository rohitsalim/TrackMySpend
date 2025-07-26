import { describe, it, expect, beforeEach } from 'vitest';
import { VendorDatabase } from '@/lib/services/vendor-database';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

describe('VendorDatabase', () => {
  const testCsvPath = join(process.cwd(), 'test-vendors.csv');
  const mockCsvContent = `Brand,Category,Subcategory,Transaction_Descriptor,Registered_Company_Name
Amazon India,E-commerce,Major Platform,"AMAZON, AMAZON.IN, AMAZON PAY",Amazon Seller Services Private Limited
Swiggy,Food Delivery,Major Platform,"SWIGGY, BUNDL TECHNOLOGIES",Bundl Technologies Private Limited
DMart,Retail,Supermarket,"DMART*[LOCATION], AVENUE SUPMKT*[CITY]",Avenue Supermarts Limited
PhonePe,Fintech,Digital Wallet,"PHONEPE, FLIPKART PAYMENTS",PhonePe Private Limited`;

  beforeEach(() => {
    // Create test CSV file
    writeFileSync(testCsvPath, mockCsvContent);
  });

  afterEach(() => {
    // Clean up test CSV file
    if (existsSync(testCsvPath)) {
      unlinkSync(testCsvPath);
    }
  });

  describe('findVendor', () => {
    let vendorDb: VendorDatabase;

    beforeEach(() => {
      vendorDb = new VendorDatabase(testCsvPath);
    });

    it('should find exact match for known descriptors', () => {
      const result = vendorDb.findVendor('AMAZON');
      expect(result).toEqual({
        brand: 'Amazon India',
        confidence: 0.98,
        category: 'E-commerce',
        matchedDescriptor: 'amazon'
      });
    });

    it('should find match when text starts with descriptor', () => {
      const result = vendorDb.findVendor('SWIGGY*ORDER12345');
      expect(result).toEqual({
        brand: 'Swiggy',
        confidence: 0.95,
        category: 'Food Delivery',
        matchedDescriptor: 'swiggy'
      });
    });

    it('should match pattern-based descriptors', () => {
      const result = vendorDb.findVendor('DMART*BANGALORE');
      expect(result).toEqual({
        brand: 'DMart',
        confidence: 0.93,
        category: 'Retail',
        matchedDescriptor: 'DMART*[LOCATION]'
      });
    });

    it('should find fuzzy match for company names', () => {
      const result = vendorDb.findVendor('BUNDL TECHNOLOGIES PVT');
      expect(result).toBeTruthy();
      expect(result?.brand).toBe('Swiggy');
      expect(result?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should return null for unknown vendors', () => {
      const result = vendorDb.findVendor('UNKNOWN VENDOR XYZ');
      expect(result).toBeNull();
    });

    it('should handle UPI transactions', () => {
      const result = vendorDb.findVendor('PHONEPE-1234567890');
      expect(result).toBeTruthy();
      expect(result?.brand).toBe('PhonePe');
    });

    it('should handle case insensitive matching', () => {
      const result = vendorDb.findVendor('amazon.in');
      expect(result).toBeTruthy();
      expect(result?.brand).toBe('Amazon India');
    });
  });

  describe('getRelevantVendorsForContext', () => {
    let vendorDb: VendorDatabase;

    beforeEach(() => {
      vendorDb = new VendorDatabase(testCsvPath);
    });

    it('should return relevant vendors for partial matches', () => {
      const vendors = vendorDb.getRelevantVendorsForContext('AMAZON SHOPPING', 5);
      expect(vendors.length).toBeGreaterThan(0);
      expect(vendors[0].brand).toBe('Amazon India');
    });

    it('should limit results based on limit parameter', () => {
      const vendors = vendorDb.getRelevantVendorsForContext('TECHNOLOGIES', 2);
      expect(vendors.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for no matches', () => {
      const vendors = vendorDb.getRelevantVendorsForContext('XYZ123ABC', 5);
      expect(vendors).toEqual([]);
    });

    it('should rank exact matches higher', () => {
      const vendors = vendorDb.getRelevantVendorsForContext('SWIGGY', 5);
      expect(vendors.length).toBeGreaterThan(0);
      expect(vendors[0].brand).toBe('Swiggy');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const vendorDb = new VendorDatabase(testCsvPath);
      const stats = vendorDb.getStats();
      
      expect(stats.loaded).toBe(true);
      expect(stats.vendorCount).toBe(4); // Based on our mock CSV
      expect(stats.descriptorCount).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle CSV loading errors gracefully', () => {
      const nonExistentPath = join(process.cwd(), 'non-existent.csv');
      const vendorDb = new VendorDatabase(nonExistentPath);
      const stats = vendorDb.getStats();
      
      expect(stats.loaded).toBe(false);
      expect(stats.vendorCount).toBe(0);
      
      // Should return null when not loaded
      const result = vendorDb.findVendor('AMAZON');
      expect(result).toBeNull();
    });

    it('should handle malformed CSV gracefully', () => {
      const malformedCsvPath = join(process.cwd(), 'malformed.csv');
      writeFileSync(malformedCsvPath, 'Invalid,CSV,Content\nMissing,Columns');
      
      const vendorDb = new VendorDatabase(malformedCsvPath);
      const stats = vendorDb.getStats();
      
      // Should not load due to missing required columns
      expect(stats.loaded).toBe(false);
      expect(stats.vendorCount).toBe(0);
      
      // Clean up
      unlinkSync(malformedCsvPath);
    });
  });
});