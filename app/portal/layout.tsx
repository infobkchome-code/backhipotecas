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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
        Comprobando sesión…
      </div>
    );
  }

  const isPortalRoot = pathname === '/portal';
  const isNewCase = pathname?.startsWith('/portal/new');

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo / Marca */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-slate-900 font-bold text-xs"
            style={{ background: '#e6f2df' }} // verde musgo muy suave
          >
            BKC
          </div>
          <div className="leading-tight">
            <div className="text-xs text-slate-500">Panel interno</div>
            <div className="text-sm font-semibold text-slate-900">
              Hipotecas BKC
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <Link
            href="/portal"
            className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
              isPortalRoot
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Expedientes
          </Link>

          <Link
            href="/portal/new"
            className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${
              isNewCase
                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Nuevo expediente
          </Link>
        </nav>

        {/* Botón logout + info horaria */}
        <div className="px-3 pb-4 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full text-xs text-slate-700 rounded-xl border border-slate-300 px-3 py-2 hover:bg-slate-100 transition-colors"
          >
            Cerrar sesión
          </button>

          <div className="px-1 text-[11px] text-slate-500">
            Lunes a viernes · 9:30–20:30
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-slate-50">
        {/* Header superior */}
        <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-emerald-700 font-semibold uppercase tracking-wide">
              Panel de gestión
            </div>
            <div className="text-lg font-semibold text-slate-900">
              Expedientes hipotecarios
            </div>
          </div>
          <div className="text-[11px] text-slate-500 text-right">
            Hipotecas BKC · Broker hipotecario independiente
          </div>
        </header>

        {/* Contenido */}
        <div className="px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
