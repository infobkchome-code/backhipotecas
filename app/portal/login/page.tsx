"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Login clásico: email + contraseña
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoadingPwd(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/portal"); // ✅ ya dentro
    } catch (err: any) {
      setMessage(`❌ ${err.message ?? "No se pudo iniciar sesión"}`);
    } finally {
      setLoadingPwd(false);
    }
  };

  // Alternativa: enviar enlace mágico (OTP) al email
  const handleSendMagicLink = async () => {
    setMessage(null);
    setLoadingOtp(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Tras hacer clic en el mail, vuelve aquí:
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      setMessage("✅ Te enviamos un enlace de acceso a tu email.");
    } catch (err: any) {
      setMessage(`❌ ${err.message ?? "No se pudo enviar el enlace"}`);
    } finally {
      setLoadingOtp(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white w-full max-w-sm p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-6">Iniciar sesión</h1>

        <form onSubmit={handlePasswordLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
          />

          <button
            type="submit"
            disabled={loadingPwd}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition"
          >
            {loadingPwd ? "Accediendo..." : "Entrar"}
          </button>
        </form>

        <div className="my-4 h-px bg-gray-200" />

        <button
          type="button"
          onClick={handleSendMagicLink}
          disabled={loadingOtp || !email}
          className="w-full border border-gray-300 hover:bg-gray-50 text-gray-800 font-medium py-2 rounded-lg transition"
          title={!email ? "Escribe tu email arriba" : ""}
        >
          {loadingOtp ? "Enviando enlace..." : "Entrar con enlace mágico"}
        </button>

        {message && (
          <p
            className={`text-sm text-center mt-4 ${
              message.startsWith("✅") ? "text-green-600" : "text-red-500"
            }`}
          >
            {message}
          </p>
        )}

        <p className="text-center text-sm mt-4 text-gray-600">
          ¿No tienes cuenta?{" "}
          <a href="/portal/register" className="text-emerald-700 font-medium underline">
            Regístrate
          </a>
        </p>
      </div>
    </div>
  );
}
