/**
 * Get the dynamic URL for the current environment
 * 
 * This function handles:
 * - Production: NEXT_PUBLIC_SITE_URL (your official site)
 * - Vercel deployments: NEXT_PUBLIC_VERCEL_URL (auto-set by Vercel)
 * - Development: http://localhost:3000/ (fallback)
 * 
 * Based on Vercel's official documentation for Supabase OAuth setup
 */
export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/'
  
  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  
  return url
}

/**
 * Get the callback URL for OAuth redirects
 * 
 * @param path - The callback path (default: 'auth/callback')
 * @returns The full callback URL for the current environment
 */
export const getCallbackURL = (path: string = 'auth/callback') => {
  return `${getURL()}${path}`
}