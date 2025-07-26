/**
 * Utility functions for handling category colors
 */

// Default color palette for categories
const DEFAULT_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#eab308', // yellow-500
]

/**
 * Generate a consistent color for a category based on its name
 */
function generateColorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  const index = Math.abs(hash) % DEFAULT_COLORS.length
  return DEFAULT_COLORS[index]
}

/**
 * Get the color for a category, using default if none is set
 */
export function getCategoryColor(category: { color: string | null; name: string }): string {
  return category.color || generateColorFromName(category.name)
}

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Calculate luminance to determine if text should be light or dark
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

/**
 * Get appropriate text color (light or dark) based on background color
 */
export function getTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor)
  if (!rgb) return '#000000' // default to black if color parsing fails
  
  const luminance = getLuminance(rgb.r, rgb.g, rgb.b)
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  
  const darken = (c: number) => Math.floor(c * (1 - percent / 100))
  
  const r = darken(rgb.r).toString(16).padStart(2, '0')
  const g = darken(rgb.g).toString(16).padStart(2, '0')
  const b = darken(rgb.b).toString(16).padStart(2, '0')
  
  return `#${r}${g}${b}`
}

/**
 * Generate CSS classes for category badge styling
 */
export function getCategoryBadgeClasses(category: { color: string | null; name: string }): {
  backgroundColor: string
  textColor: string
  style: React.CSSProperties
} {
  const backgroundColor = getCategoryColor(category)
  
  return {
    backgroundColor,
    textColor: '#000000',
    style: {
      backgroundColor: backgroundColor + '30', // 30% opacity for background (increased from 20%)
      color: '#000000', // Black text
      borderColor: backgroundColor + '40', // 40% opacity for border
    }
  }
}