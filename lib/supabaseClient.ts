// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

// Variables de entorno (asegúrate de agregarlas en Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Inicializa el cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
