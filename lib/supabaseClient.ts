// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// URL y KEY públicas (las mismas que tienes en Vercel)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Seguridad: si falta algo, rompemos en build para verlo claro
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in supabaseClient.ts');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in supabaseClient.ts');
}

// Cliente normal (lado cliente y servidor con anon key)
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Export nombrado (lo que usan todos tus imports: { supabase })
export { supabase };

// Export por defecto por si en algún sitio haces "import supabase from ..."
export default supabase;
