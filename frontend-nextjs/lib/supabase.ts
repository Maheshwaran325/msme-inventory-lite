import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for our database
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
