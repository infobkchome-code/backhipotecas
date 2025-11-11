export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-green-900 to-green-600 text-white">
      <h1 className="text-4xl font-bold">Bienvenido al portal BKC Home</h1>
      <p className="mt-3 text-lg text-white/80">Accede o regístrate para seguir tu hipoteca</p>
      <div className="mt-6 flex gap-4">
        <a href="/portal/login" className="px-5 py-3 bg-yellow-400 text-black font-semibold rounded-xl hover:bg-yellow-500 transition">
          Iniciar sesión
        </a>
        <a href="/portal/register" className="px-5 py-3 border border-white/40 rounded-xl hover:bg-white/10">
          Crear cuenta
        </a>
      </div>
    </main>
  );
}

