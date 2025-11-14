// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Estas dos variables YA las tienes en Vercel (las mismas que usaba el proyecto):
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Comprobaciones para evitar errores silenciosos
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in supabaseClient.ts');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in supabaseClient.ts');
}

// Cliente normal (frontend + rutas API)
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Export default por si en algún sitio se usa "import supabase from ..."
export default supabase;
