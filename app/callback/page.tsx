'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // 1) Caso antiguo (hash con access_token / refresh_token)
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : '';
    const h = new URLSearchParams(hash);
    const access_token = h.get('access_token');
    const refresh_token = h.get('refresh_token');

    const handle = async () => {
      try {
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
          router.replace('/portal');
          return;
        }
        // 2) Caso nuevo (PKCE): ?code=...
        const search = new URLSearchParams(window.location.search);
        const code = search.get('code');
        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
          router.replace('/portal');
          return;
        }
        // Sin tokens: a login
        router.replace('/portal/login?e=callback');
      } catch {
        router.replace('/portal/login?e=callback');
      }
    };

    handle();
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center">
      <p>Iniciando sesión…</p>
    </div>
  );
}

