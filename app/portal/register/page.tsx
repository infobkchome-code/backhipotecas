'use client';

import Link from 'next/link';

export default function RegisterDisabledPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-semibold">Alta de usuario desactivada</h1>
        <p className="text-sm text-slate-400">
          El registro de nuevos usuarios está desactivado. 
          El acceso al portal interno es solo para uso interno de BKC Hipotecas.
        </p>
        <p className="text-sm text-slate-400">
          Si eres Nahuel, entra con el correo autorizado desde la página de inicio de sesión.
        </p>
        <Link
          href="/portal/login"
          className="inline-flex mt-2 items-center justify-center rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-medium px-4 py-2 transition"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </div>
  );
}

