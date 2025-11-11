'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMsg(error.message);
    else setMsg('Cuenta creada, revisa tu correo para confirmar.');
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-green-900 text-white">
      <h1 className="text-3xl font-bold mb-4">Crear cuenta</h1>
      <form onSubmit={handleRegister} className="bg-white/10 p-6 rounded-2xl shadow w-80 space-y-4">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg text-black"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg text-black"
        />
        {msg && <p className="text-yellow-400 text-sm">{msg}</p>}
        <button type="submit" className="w-full bg-yellow-400 text-black font-semibold p-3 rounded-lg hover:bg-yellow-500">
          Registrarme
        </button>
      </form>
    </main>
  );
}

