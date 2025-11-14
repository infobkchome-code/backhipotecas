// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// OJO: aquí no lanzamos errores si faltan, para que nunca quede "undefined"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente único para toda la app (cliente + servidor con anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export por defecto por si en algún sitio haces "import supabase from ..."
export default supabase;
