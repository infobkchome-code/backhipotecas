'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    password: '',
    confirm: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones
    if (!form.nombre || !form.apellido || !form.email || !form.password) {
      setError('Completa todos los campos obligatorios.');
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError('La contraseña debe tener mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const user = authData.user;
    if (!user) {
      setError('No se pudo crear el usuario.');
      setLoading(false);
      return;
    }

    // 2. Crear registro en tabla clientes
    const { error: insertError } = await supabase.from('clientes').insert({
      user_id: user.id,
      nombre: form.nombre + ' ' + form.apellido,
      email: form.email,
      telefono: form.telefono,
    });

    if (insertError) {
      setError('Usuario creado, pero ocurrió un error guardando los datos.');
      setLoading(false);
      return;
    }

    // 3. Redirigir al login
    router.push('/portal/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="max-w-md w-full bg-slate-900 p-6 rounded-xl shadow space-y-4">

        <h1 className="text-xl font-bold">Crear cuenta</h1>
        <p className="text-sm text-slate-400">
          Regístrate para acceder a tu panel de seguimiento hipotecario.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm">Nombre</label>
            <input
              name="nombre"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="text-sm">Apellido</label>
            <input
              name="apellido"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="text-sm">Teléfono</label>
            <input
              name="telefono"
              type="tel"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="text-sm">Email</label>
            <input
              name="email"
              type="email"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="text-sm">Contraseña</label>
            <input
              name="password"
              type="password"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="text-sm">Confirmar contraseña</label>
            <input
              name="confirm"
              type="password"
              className="w-full mt-1 px-3 py-2 rounded bg-slate-800 border border-slate-700"
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <button
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold py-2 rounded-lg transition disabled:opacity-60"
          >
            {loading ? 'Creando cuenta…' : 'Registrarse'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link href="/portal/login" className="text-emerald-400 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
