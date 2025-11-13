'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Cliente = {
  id: string;
  user_id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  created_at: string;
};

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

type DocFile = { name: string };

export default function CaseDetailPage() {
  // ⚠️ Este id es el ID DEL CLIENTE
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [caso, setCaso] = useState<Caso | null>(null);
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

      // 1) Cargar cliente
      const { data: clienteData, error: clienteError } = await supabase
        .from<Cliente>('clientes')
        .select('*')
        .eq('id', id)          // id de la URL = id del cliente
        .eq('user_id', user.id)
        .single();

      if (clienteError || !clienteData) {
        setErrorMsg('Cliente no encontrado.');
        setLoading(false);
        return;
      }

      setCliente(clienteData);

      // 2) Buscar caso de ese cliente, o crearlo si no existe
      const { data: casosData, error: casosError } = await supabase
        .from<Caso>('casos')
        .select('*')
        .eq('cliente_id', clienteData.id)
        .eq('user_id', user.id)
        .limit(1);

      let casoFinal: Caso | null = null;

      if (casosError) {
        setErrorMsg(casosError.message);
        setLoading(false);
        return;
      }

      if (!casosData || casosData.length === 0) {
        // No hay caso todavía → creamos uno por defecto
        const { data: nuevoCaso, error: insertError } = await supabase
          .from<Caso>('casos')
          .insert({
            user_id: user.id,
            cliente_id: clienteData.id,
            titulo: `Expediente ${clienteData.nombre}`,
            estado: 'en_estudio',
            progreso: 0,
            notas: 'Expediente creado automáticamente.',
          })
          .select('*')
          .single();

        if (insertError || !nuevoCaso) {
          setErrorMsg('No se ha podido crear el expediente.');
          setLoading(false);
          return;
        }

        casoFinal = nuevoCaso;
      } else {
        casoFinal = casosData[0];
      }

      setCaso(casoFinal);

      // 3) Listar documentos del bucket docs
      const path = `${user.id}/${casoFinal.id}`;
      const { data: files, error: storageError } = await supabase.storage
        .from('docs')
        .list(path, { limit: 100 });

      if (!storageError && files) {
        setDocs(files as unknown as DocFile[]);
      }

      setLoading(false);
    })();
  }, [id]);

  // Subida de documentos
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
        const { data: files } = await supabase.storage
          .from('docs')
          .list(`${user.id}/${caso.id}`, { limit: 100 });

        if (files) setDocs(files as unknown as DocFile[]);
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // -------- UI --------

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

  if (!cliente || !caso) {
    return (
      <div className="p-6 text-slate-100">
        No se ha podido cargar el expediente.
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
        <button
          onClick={() => router.push('/portal')}
          className="text-sm text-sky-400 hover:text-sky-300 mb-2"
        >
          ← Volver al panel de clientes
        </button>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Expediente hipotecario
          </h1>
          <p className="text-sm text-slate-400">
            Seguimiento del cliente y gestión de documentación.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cliente + caso */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold mb-3">Datos del cliente</h2>
              <div className="space-y-1 text-sm">
                <div className="font-medium text-slate-100">
                  {cliente.nombre}
                </div>
                <div className="text-slate-300">{cliente.email}</div>
                {cliente.telefono && (
                  <div className="text-slate-300">{cliente.telefono}</div>
                )}
                <div className="text-xs text-slate-500 mt-2">
                  Alta:{' '}
                  {new Date(cliente.created_at).toLocaleDateString('es-ES')}
                </div>
              </div>
            </div>

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

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Progreso del expediente</span>
                  <span>{caso.progreso}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(Math.max(caso.progreso, 0), 100)}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium mb-1">Notas internas</h3>
                <p className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                  {caso.notas && caso.notas.trim().length > 0
                    ? caso.notas
                    : 'Sin notas por el momento.'}
                </p>
              </div>
            </div>
          </div>

          {/* Documentación */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <h2 className="text-lg font-semibold mb-3">Documentación</h2>
              <p className="text-xs text-slate-400 mb-3">
                Sube aquí DNI, nóminas, IRPF, contrato, etc.
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
                          (guardado en Supabase)
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400 space-y-2">
              <p>✅ Cada cliente tiene su expediente único.</p>
              <p>
                ✅ Solo tú (usuario autenticado) puedes ver estos datos en el
                portal interno.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
