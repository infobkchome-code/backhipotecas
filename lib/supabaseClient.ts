// lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// URLs y keys públicas (las que YA tienes en Vercel/Supabase)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Comprobaciones para no tener errores silenciosos
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in supabaseClient.ts');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in supabaseClient.ts');
}

// Creamos el cliente
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Export nombrado (lo que reclaman todos los imports)
export { supabase };

// Export por defecto por si en algún sitio se usa "import supabase from ..."
export default supabase;
