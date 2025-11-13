'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Caso = {
  id: string;
  user_id: string;
  cliente_id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

type Cliente = {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
};

type Expediente = {
  id: string;
  user_id: string;
  caso_id: string;
  step_key: string;
  created_at: string;
  updated_at: string;
};

type DocFile = {
  name: string;
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [caso, setCaso] = useState<Caso | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Carga principal de datos
  useEffect(() => {
    if (!id) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMsg('Usuario no autenticado');
        setLoading(false);
        return;
      }

      // 1) Caso
      const { data: casoData, error: casoError } = await supabase
        .from<Caso>('casos')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (casoError || !casoData) {
        setErrorMsg('Caso no encontrado.');
        setLoading(false);
        return;
      }

      setCaso(casoData);

      // 2) Cliente del caso
      const { data: clienteData } = await supabase
        .from<Cliente>('clientes')
        .select('*')
        .eq('id', casoData.cliente_id)
        .eq('user_id', user.id)
        .single();

      if (clienteData) setCliente(clienteData);

      // 3) Expedientes ligados a este caso
      const { data: expData } = await supabase
        .from<Expediente>('expedientes')
        .select('*')
        .eq('caso_id', casoData.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (expData) setExpedientes(expData);

      // 4) Documentos en el bucket docs (ruta: userId/casoId/...)
      const path = `${user.id}/${casoData.id}`;

      const { data: files, error: storageError } = await supabase.storage
        .from('docs')
        .list(path, { limit: 100 });

      if (!storageError && files) {
        setDocs(files as unknown as DocFile[]);
      }

      setLoading(false);
    })();
  }, [id]);

  // Subir documento
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !caso) return;

    setUploading(true);
    setErrorMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg('Usuario no autenticado');
      setUploading(false);
      return;
    }

    try {
      const filePath = `${user.id}/${caso.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('docs')
        .upload(filePath, file);

      if (uploadError) {
        setErrorMsg(uploadError.message);
      } else {
        // Volvemos a listar los docs
        const { data: files } = await supabase.storage
          .from('docs')
          .list(`${user.id}/${caso.id}`, { limit: 100 });

        if (files) setDocs(files as unknown as DocFile[]);
      }
    } finally {
      setUploading(false);
      e.target.value = ''; // limpiar input
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-100">Cargando expediente…</div>;
  }

  if (errorMsg) {
    return (
      <div className="p-6 text-red-400">
        {errorMsg}{' '}
        <button
          onClick={() => router.push('/portal')}
          className="ml-2 text-sm underline text-sky-400"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="p-6 text-slate-100">
        Caso no encontrado.
        <button
          onClick={() => router.push('/portal')}
          className="ml-2 text-sm underline text-sky-400"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Breadcrumb */}
        <button
          onClick={() => router.push('/portal')}
          className="text-sm text-sky-400 hover:text-sky-300 mb-2"
        >
          ← Volver al panel de clientes
        </button>

        {/* Cabecera */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Expediente hipotecario
          </h1>
          <p className="text-sm text-slate-400">
            Seguimiento completo del cliente y su operación.
          </p>
        </div>

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: info cliente + caso */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info del cliente */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold mb-3">Datos del cliente</h2>
              {cliente ? (
                <div className="space-y-1 text-sm">
                  <div className="font-medium text-slate-100">
                    {cliente.nombre}
                  </div>
                  <div className="text-slate-300">{cliente.email}</div>
                  {cliente.telefono && (
                    <div className="text-slate-300">{cliente.telefono}</div>
                  )}
                  <div className="text-xs text-slate-500 mt-2">
                    Alta en el sistema:{' '}
                    {new Date(cliente.created_at).toLocaleDateString('es-ES')}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  No se han encontrado datos del cliente.
                </div>
              )}
            </div>

            {/* Info del caso */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{caso.titulo}</h2>
                  <p className="text-xs text-slate-400">
                    Creado el{' '}
                    {new Date(caso.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 border border-sky-500/30">
                  Estado: {caso.estado}
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Progreso del expediente</span>
                  <span>{caso.progreso}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(Math.max(caso.progreso, 0), 100)}%` }}
                  />
                </div>
              </div>

              {/* Notas internas */}
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-1">Notas internas</h3>
                <p className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                  {caso.notas && caso.notas.trim().length > 0
                    ? caso.notas
                    : 'Sin notas por el momento.'}
                </p>
              </div>
            </div>

            {/* Línea temporal de expedientes/pasos */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold mb-3">
                Línea temporal del expediente
              </h2>
              {expedientes.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Aún no hay pasos registrados en este expediente.
                </p>
              ) : (
                <ol className="relative border-l border-slate-700/60 ml-2 space-y-4">
                  {expedientes.map((e) => (
                    <li key={e.id} className="ml-4">
                      <div className="absolute -left-[9px] mt-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]" />
                      <div className="text-xs text-slate-400">
                        {new Date(e.created_at).toLocaleString('es-ES')}
                      </div>
                      <div className="text-sm font-medium text-slate-100">
                        {e.step_key}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          {/* Columna derecha: documentación */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold mb-3">Documentación</h2>
              <p className="text-xs text-slate-400 mb-3">
                Sube aquí los documentos del cliente (DNI, nóminas, contrato,
                vida laboral, IRPF, nota simple, tasación, etc.).
              </p>

              <label className="block">
                <span className="text-xs font-medium text-slate-300 mb-1 block">
                  Subir documento
                </span>
                <input
                  type="file"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="block w-full text-xs text-slate-200
                             file:mr-3 file:py-1.5 file:px-3
                             file:rounded-full file:border-0
                             file:text-xs file:font-medium
                             file:bg-emerald-500/90 file:text-slate-950
                             hover:file:bg-emerald-400
                             cursor-pointer"
                />
              </label>
              {uploading && (
                <p className="text-xs text-slate-400 mt-2">
                  Subiendo documento…
                </p>
              )}

              <div className="mt-4 border-t border-slate-800 pt-3">
                <h3 className="text-sm font-medium mb-2">Archivos subidos</h3>
                {docs.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Aún no hay documentos asociados a este expediente.
                  </p>
                ) : (
                  <ul className="space-y-1 text-xs">
                    {docs.map((f) => (
                      <li
                        key={f.name}
                        className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/60 px-2 py-1.5"
                      >
                        <span className="truncate">{f.name}</span>
                        <span className="text-[10px] text-slate-500">
                          (Disponible desde el panel interno)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Bloque info rápida */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 space-y-2">
              <p>
                ✅ Solo tú puedes ver y gestionar este expediente y sus
                documentos.
              </p>
              <p>
                ✅ Cada cliente tendrá su propio acceso en el futuro para ver el
                estado y la documentación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
