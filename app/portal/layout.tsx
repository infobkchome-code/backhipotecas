import Link from "next/link";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6 p-6">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 h-fit">
          <div className="text-sm font-semibold">CRM · Hipotecas BKC</div>
          <div className="text-xs text-slate-500 mt-1">Panel interno</div>

          <nav className="mt-4 flex flex-col gap-1">
            <Link
              href="/portal"
              className="rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
            >
              Expedientes
            </Link>

            <Link
              href="/portal/new"
              className="rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
            >
              Nuevo expediente
            </Link>

            <Link
              href="/portal/leads-valorador"
              className="rounded-xl px-3 py-2 text-sm hover:bg-slate-50"
            >
              Leads Valorador
            </Link>
          </nav>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {children}
        </section>
      </div>
    </div>
  );
}
