// Supabase browser client (cookie session via @supabase/ssr + root middleware)

import { createBrowserSupabaseClient } from '@/utils/supabase/client'
import { getSupabaseUrl, getSupabaseAnonKey } from '@/utils/supabase/env'

export const supabase = createBrowserSupabaseClient()

export const isSupabaseConfigured = () => !!(getSupabaseUrl() && getSupabaseAnonKey())

// Types
export interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
  bio?: string
  experience_level: 'Beginner' | 'Intermediate' | 'Expert'
  location?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  created_at: string
}

export interface Vehicle {
  id: string
  user_id: string
  year: number
  make: string
  model: string
  trim?: string
  modifications?: string
  photo_url?: string
  is_primary: boolean
}

export interface Club {
  id: string
  name: string
  slug: string
  logo?: string
  description?: string
  location?: string
  website?: string
  instagram?: string
  verified: boolean
  premium: boolean
  owner_id: string
}

export interface Run {
  id: string
  club_id?: string
  trail_id?: string
  title: string
  description?: string
  date: string
  meetup_location?: string
  difficulty: 'Easy' | 'Moderate' | 'Challenging' | 'Extreme'
  max_participants: number
  vehicle_requirements?: string
  status: 'upcoming' | 'active' | 'completed' | 'cancelled'
}

export interface Message {
  id: string
  run_id: string
  user_id: string
  content: string
  created_at: string
  user?: User
}

// Helper to fetch user with profile
export async function getUserProfile(userId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data as User
}

// Helper to fetch user vehicles
export async function getUserVehicles(userId: string) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
  
  if (error) throw error
  return data as Vehicle[]
}

// Helper to fetch clubs
export async function getClubs(limit = 20) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('clubs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) throw error
  return data as Club[]
}

// Helper to fetch runs
export async function getRuns(filters?: { clubId?: string; status?: string; limit?: number }) {
  if (!supabase) throw new Error('Supabase not configured')
  let query = supabase
    .from('runs')
    .select('*, club:clubs(name, logo)')
    .order('date', { ascending: true })
  
  if (filters?.clubId) {
    query = query.eq('club_id', filters.clubId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.limit) {
    query = query.limit(filters.limit)
  }
  
  const { data, error } = await query
  if (error) throw error
  return data
}

// Helper to fetch run messages
export async function getRunMessages(runId: string, limit = 50) {
  if (!supabase) throw new Error('Supabase not configured')
  const { data, error } = await supabase
    .from('messages')
    .select('*, user:users(name, avatar_url)')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
    .limit(limit)
  
  if (error) throw error
  return data as Message[]
}
