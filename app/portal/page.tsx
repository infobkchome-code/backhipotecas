'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Portal() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) window.location.href = '/portal/login';
      else setUser(data.user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen bg-gray-100 p-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-green-900">Panel del cliente</h1>
        <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-lg">Cerrar sesión</button>
      </div>
      {user && <p className="text-gray-700">Hola, {user.email}</p>}
      <div className="mt-6 bg-white p-6 rounded-xl shadow">
        <h2 className="text-xl font-semibold">Tus expedientes</h2>
        <p className="mt-2 text-gray-500">Aquí aparecerán los casos o hipotecas que estás gestionando.</p>
      </div>
    </main>
  );
}

