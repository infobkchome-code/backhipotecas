'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  children: ReactNode;
};

export default function PortalLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        const redirectTo = pathname || '/portal';
        router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
      } else {
        setChecking(false);
      }
    };
    checkSession();
  }, [router, pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200 text-sm">
        Comprobando sesión…
      </div>
    );
  }

  const isPortalRoot = pathname === '/portal';

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-emerald-500 flex items-center justify-center text-slate-900 font-bold">
            BKC
          </div>
          <div className="leading-tight">
            <div className="text-xs text-slate-400">Panel interno</div>
            <div className="text-sm font-semibold">BKC Hipotecas</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <Link
            href="/portal"
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
              isPortalRoot
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Expedientes
          </Link>
          <Link
            href="/portal/new"
            className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
              pathname?.startsWith('/portal/new')
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Nuevo expediente
          </Link>
        </nav>

        <button
          onClick={handleLogout}
          className="m-3 mb-4 text-xs text-slate-300 rounded-xl border border-slate-700 px-3 py-2 hover:bg-slate-800/80"
        >
          Cerrar sesión
        </button>

        <div className="px-4 pb-4 text-[11px] text-slate-500">
          Lunes a viernes · 9:30–20:30
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-slate-950">
        <header className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">PANEL DE GESTIÓN</div>
            <div className="text-lg font-semibold text-slate-50">
              Expedientes hipotecarios
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Lunes a viernes · 9:30–20:30
          </div>
        </header>

        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
