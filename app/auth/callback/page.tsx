"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      try {
        // Intercambia el código o fragmento del email por una sesión válida
        await supabase.auth.exchangeCodeForSession(window.location.href);
        // Redirige al panel
        router.replace("/portal");
      } catch (e) {
        console.error(e);
        router.replace("/portal/login?error=callback");
      }
    };
    run();
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center">
      <p className="text-sm text-gray-600">Verificando enlace…</p>
    </div>
  );
}

