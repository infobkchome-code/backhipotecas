'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// ✅ TODO lo que use useSearchParams va dentro del componente envuelto en Suspense
function LoginInner() {
  const searchParams = useSearchParams();

  // Ejemplo típico: ?redirect=/portal
  const redirectTo = searchParams.get('redirect') ?? '/portal';

  // ⬇️ Pega aquí tu UI/login real (y usa redirectTo si lo necesitas)
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-lg font-semibold text-slate-900">Acceso</h1>
        <p className="text-xs text-slate-500 mt-1">Redirigirá a: {redirectTo}</p>

        {/* TU FORMULARIO / BOTONES DE LOGIN AQUÍ */}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-sm text-slate-600">Cargando…</div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
