import type { ReactNode } from 'react';
import Link from 'next/link';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex">
      {/* SIDEBAR - solo visible en escritorio/tablet */}
      <aside className="hidden md:flex md:flex-col w-64 bg-slate-950 text-slate-50 border-r border-slate-800">
        {/* Logo y título */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center text-sm font-bold text-slate-950">
            BKC
          </div>
          <div>
            <p className="text-sm font-semibold">BKC Hipotecas</p>
            <p className="text-xs text-slate-400">Panel interno</p>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 text-sm">
          <Link
            href="/portal"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-slate-50 border border-slate-700"
          >
            <span className="text-xs">📂</span>
            <span>Expedientes</span>
          </Link>

          <Link
            href="/portal/clients/new"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-200 hover:bg-slate-900/70 hover:border-slate-700 border border-transparent"
          >
            <span className="text-xs">➕</span>
            <span>Nuevo expediente</span>
          </Link>
        </nav>

        {/* Pie: usuario / info */}
        <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            <p className="font-medium text-slate-200">Nahuel</p>
            <p className="text-[11px]">Gestor de hipotecas</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold">
            N
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col">
        {/* TOPBAR (visible también en móvil) */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3 md:px-6 flex items-center justify-between">
          {/* Móvil: logo simple */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-xs font-bold text-slate-950">
              BKC
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                BKC Hipotecas
              </p>
              <p className="text-[11px] text-slate-500">
                Panel de expedientes
              </p>
            </div>
          </div>

          {/* Escritorio: título genérico */}
          <div className="hidden md:flex flex-col">
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Panel de gestión
            </span>
            <span className="text-sm font-semibold text-slate-900">
              Expedientes hipotecarios
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline text-xs text-slate-500">
              Lunes a viernes · 9:30–20:30
            </span>
            <div className="h-8 w-8 rounded-full bg-slate-900 text-slate-100 flex items-center justify-center text-xs font-semibold md:hidden">
              N
            </div>
          </div>
        </header>

        {/* CONTENIDO DE CADA PÁGINA DEL PORTAL */}
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
