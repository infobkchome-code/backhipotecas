"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Check,
  Upload,
  FileText,
  Loader2,
  MessageSquare,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type StepKey =
  | "docs_recibidos"
  | "estudio"
  | "preaprobacion"
  | "fein"
  | "tasacion"
  | "firma";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "docs_recibidos", label: "Documentación recibida" },
  { key: "estudio", label: "Estudio de viabilidad" },
  { key: "preaprobacion", label: "Preaprobación" },
  { key: "fein", label: "FEIN / Oferta vinculante" },
  { key: "tasacion", label: "Tasación" },
  { key: "firma", label: "Firma en notaría" },
];

export default function PortalPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Estado “falso” por defecto hasta que conectes tabla "expedientes"
  // Si luego creas la tabla y lees el estado real, reemplaza desde Supabase.
  const [currentStep, setCurrentStep] = useState<StepKey>("estudio");
  const [percent, setPercent] = useState<number>(0);

  // Document upload state
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  // Mensajes (placeholder)
  const [messages] = useState<
    { id: string; title: string; body: string; date: string }[]
  >([
    {
      id: "1",
      title: "Actualización de condiciones",
      body:
        "El banco A confirma tipo del 3,10% TIN a 30 años (sin bonificar). Queda pendiente simulación con bonificaciones.",
      date: "12/11/2025",
    },
    {
      id: "2",
      title: "FEIN prevista",
      body:
        "Si todo fluye, recibirás tu FEIN personalizada esta semana. Recuerda revisar el simulador y dudas.",
      date: "11/11/2025",
    },
  ]);

  // Carga de sesión (email)
  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setEmail(data.user?.email ?? null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Progreso según paso
  useEffect(() => {
    const idx = STEPS.findIndex((s) => s.key === currentStep);
    setPercent(Math.round(((idx + 1) / STEPS.length) * 100));
  }, [currentStep]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/portal/login";
  };

  const onUpload = async (file: File) => {
    setUploadMsg(null);
    setUploading(true);
    try {
      // Requiere un bucket público llamado "docs" en Supabase Storage
      // Storage → Create bucket → docs (public).
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("docs").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

      if (error) {
        if (error.message?.toLowerCase().includes("not found")) {
          setUploadMsg(
            "⚠️ Falta el bucket 'docs' en Supabase Storage. Créalo para habilitar las subidas."
          );
        } else {
          setUploadMsg("❌ Error subiendo archivo: " + error.message);
        }
        return;
      }

      setUploadMsg("✅ Documento subido correctamente.");
    } catch (e: any) {
      setUploadMsg("❌ Error inesperado: " + (e?.message ?? "desconocido"));
    } finally {
      setUploading(false);
    }
  };

  const StatusPill = ({ done }: { done: boolean }) => (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
        done ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      {done ? "Completado" : "Pendiente"}
    </span>
  );

  const StepItem = ({
    step,
    index,
    active,
    done,
  }: {
    step: (typeof STEPS)[number];
    index: number;
    active: boolean;
    done: boolean;
  }) => (
    <div className="relative flex gap-3 p-4 bg-white rounded-xl border border-gray-100 shadow-soft">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          done
            ? "bg-emerald-600 text-white"
            : active
            ? "bg-emerald-100 text-emerald-700"
            : "bg-gray-100 text-gray-600"
        }`}
      >
        {index + 1}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900">{step.label}</p>
          <StatusPill done={done} />
        </div>
        {active && (
          <p className="mt-1 text-sm text-gray-600">
            Estamos trabajando en esta fase. Te avisaremos aquí de cualquier
            novedad.
          </p>
        )}
      </div>
      {done && <Check className="w-5 h-5 text-emerald-600" />}
    </div>
  );

  const Progress = () => (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Progreso</p>
        <p className="text-sm font-medium text-gray-900">{percent}%</p>
      </div>
      <div className="mt-2 h-3 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-3 bg-emerald-600 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );

  const UploadCard = () => (
    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-soft">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Subir documentación</h3>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Sube DNI, nóminas, vida laboral, IRPF, escrituras… en PDF o imagen.
      </p>

      <label className="mt-4 block">
        <input
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium cursor-pointer hover:bg-emerald-700">
          <Upload className="w-4 h-4" />
          Seleccionar archivo
        </span>
      </label>

      {uploading && (
        <p className="mt-3 text-sm text-gray-600 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Subiendo…
        </p>
      )}
      {uploadMsg && (
        <p className="mt-3 text-sm">{uploadMsg}</p>
      )}

      <p className="mt-4 text-xs text-gray-500">
        * Para activar las subidas, crea el bucket <b>docs</b> en Supabase
        Storage (público) y, si quieres privacidad, añade políticas RLS con
        JWT.
      </p>
    </div>
  );

  const Messages = () => (
    <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-soft">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Mensajes y novedades</h3>
      </div>
      <div className="mt-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className="p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{m.title}</p>
              <span className="text-xs text-gray-500">{m.date}</span>
            </div>
            <p className="mt-1 text-sm text-gray-700">{m.body}</p>
          </div>
        ))}
      </div>
      <a
        href="#"
        className="mt-4 inline-flex items-center gap-1 text-sm text-emerald-700 font-medium"
        onClick={(e) => e.preventDefault()}
        title="Pronto podrás responder aquí mismo"
      >
        Ver más <ChevronRight className="w-4 h-4" />
      </a>
    </div>
  );

  const activeIndex = useMemo(
    () => STEPS.findIndex((s) => s.key === currentStep),
    [currentStep]
  );

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          Cargando tu portal…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Hipotecas BKC</p>
            <h1 className="font-semibold text-gray-900">Tu portal de cliente</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {email ? email : "Sesión"}
            </span>
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Resumen + progreso */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-5 bg-white rounded-2xl border border-gray-100 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                Estado de tu hipoteca
              </h2>
              <div className="text-xs text-gray-500">
                N.º de expediente: <span className="font-mono">BKC-2025-001</span>
              </div>
            </div>

            <div className="mt-4">
              <Progress />
            </div>

            <div className="mt-4 grid gap-3">
              {STEPS.map((s, i) => {
                const done = i < activeIndex;
                const active = i === activeIndex;
                return (
                  <StepItem
                    key={s.key}
                    step={s}
                    index={i}
                    active={active}
                    done={done}
                  />
                );
              })}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              * El avance es orientativo. Cualquier cambio importante te lo
              notificaremos aquí.
            </div>
          </div>

          <div className="space-y-6">
            <UploadCard />
            <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-soft">
              <h3 className="font-semibold text-gray-900">Consejo útil</h3>
              <p className="mt-2 text-sm text-gray-600">
                Sube siempre tus documentos en **PDF** o imágenes legibles.
                Evita fotos borrosas para acelerar el estudio.
              </p>
            </div>
          </div>
        </div>

        {/* Mensajes / novedades */}
        <div className="mt-6">
          <Messages />
        </div>
      </main>
    </div>
  );
}
