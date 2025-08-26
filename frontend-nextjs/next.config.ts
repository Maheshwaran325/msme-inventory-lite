import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable static exports if needed
  // output: 'export',
  
  // Environment variables for Vercel
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  
  // Experimental features
  experimental: {
    // Remove turbo config that might cause issues
  },
  
  // Build optimization

  
  // Image optimization
  images: {
    domains: ['localhost'],
    unoptimized: false,
  },
}

export default nextConfig
