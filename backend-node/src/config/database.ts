import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables SUPABASE_URL or SUPABASE_SERVICE_KEY')
}

// Using service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database types
export interface Product {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  unit_price: number
  created_at: string
  updated_at: string
  version: number
  created_by?: string
  updated_by?: string
}

export interface UserProfile {
  id: string
  email: string
  role: 'owner' | 'staff'
  created_at: string
  updated_at: string
}
