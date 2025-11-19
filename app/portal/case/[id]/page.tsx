'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Caso = {
  id: string;
  titulo: string;
  estado: string;
  progreso: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  seguimiento_token: string | null;
  urgente: boolean;
  fecha_limite: string | null;
  tipo_cliente: string; // 👈 NUEVO
};

type FileItem = {
  id: string;
  tipo: string;
  nombre_archivo: string;
  storage_path: string;
  created_at: string;
};

type LogItem = {
  id: string;
  created_at: string;
  tipo: string;
  descripcion: string | null;
  visible_cliente: boolean;
};

type NotaItem = {
  id: string;
  contenido: string;
  created_at: string;
  user_id: string | null;
};

// ✅ Checklist
type ChecklistItem = {
  id: string; // id de casos_documentos_requeridos
  completado: boolean;
  completado_en: string | null;
  doc: {
    id: string;
    tipo: string;
    descripcion: string | null;
    obligatorio: boolean;
    orden: number | null;
  } | null;
};

const ESTADOS = [
  { value: 'en_estudio', label: 'En estudio' },
  { value: 'tasacion', label: 'Tasación' },
  { value: 'fein', label: 'FEIN / Oferta' },
  { value: 'notaria', label: 'Notaría' },
  { value: 'compraventa', label: 'Firma compraventa' },
  { value: 'fin', label: 'Expediente finalizado' },
  { value: 'denegado', label: 'Denegado' },
];

const DOC_TIPOS = [
  { value: 'dni', label: 'DNI / NIE' },
  { value: 'nominas', label: 'Nómina(s)' },
  { value: 'contrato_trabajo', label: 'Contrato de trabajo' },
  { value: 'vida_laboral', label: 'Vida laboral' },
  { value: 'renta', label: 'IRPF / Renta' },
  { value: 'modelo_130', label: 'Modelo 130' },
  { value: 'modelo_303', label: 'Modelo 303' },
  { value: 'modelo_390', label: 'Modelo 390' },
  { value: 'modelo_347', label: 'Modelo 347' },
  { value: 'libro_ingresos_gastos', label: 'Libro ingresos/gastos' },
  { value: 'escrituras', label: 'Escrituras' },
  { value: 'cif', label: 'CIF' },
  { value: 'cuentas_anuales', label: 'Cuentas anuales' },
  { value: 'balance', label: 'Balance / PyG' },
  { value: 'certificados_aeat', label: 'Certificados AEAT' },
  { value: 'cert_ss', label: 'Certificado SS' },
  { value: 'extractos', label: 'Extractos bancarios' },
  {
    value: 'documento_ingresos_especiales',
    label: 'Ingresos especiales',
  },
  { value: 'otros', label: 'Otros' },
];

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id as string;

  const [caso, setCaso] = useState<Caso | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Campos editables
  const [estado, setEstado] = useState('en_estudio');
  const [progreso, setProgreso] = useState(0);
  const [notas, setNotas] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [fechaLimite, setFechaLimite] = useState<string | null>(null);

  // Documentos
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docTipo, setDocTipo] = useState('otros');
  const [uploading, setUploading] = useState(false);
  const [docsMsg, setDocsMsg] = useState<string | null>(null);

  // Logs
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Notas internas tipo chat
  const [notasLista, setNotasLista] = useState<NotaItem[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');

  // userId
  const [userId, setUserId] = useState<string | null>(null);

  // feedback copiar enlace
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  // ✅ Checklist
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  // ----------------------------------------------------------
  // Helper: decidir qué tipos de doc van según tipo_cliente
  // ----------------------------------------------------------
  const tiposPorCliente = (tipo: string): string[] => {
    const t = tipo || 'cuenta_ajena';

    if (t === 'cuenta_ajena') {
      return [
        'dni',
        'nominas',
        'contrato_trabajo',
        'vida_laboral',
        'renta',
        'extractos',
      ];
    }

    if (t === 'autonomo') {
      return [
        'dni',
        'renta',
        'vida_laboral',
        'modelo_130',
        'modelo_303',
        'modelo_390',
        'modelo_347',
        'libro_ingresos_gastos',
        'extractos',
      ];
    }

    if (t === 'mixto') {
      return [
        'dni',
        'nominas',
        'contrato_trabajo',
        'renta',
        'vida_laboral',
        'modelo_130',
        'modelo_303',
        'modelo_390',
        'modelo_347',
        'extractos',
        'libro_ingresos_gastos',
      ];
    }

    if (t === 'empresa') {
      return [
        'dni',
        'renta',
        'escrituras',
        'cif',
        'cuentas_anuales',
        'balance',
        'certificados_aeat',
        'cert_ss',
        'extractos',
      ];
    }

    if (t === 'otros') {
      return ['documento_ingresos_especiales'];
    }

    // Por defecto, tratamos como cuenta ajena
    return [
      'dni',
      'nominas',
      'contrato_trabajo',
      'vida_laboral',
      'renta',
      'extractos',
    ];
  };

  // ----------------------------------------------------------
  // Cargar checklist documental; si está vacío, lo crea
  // ----------------------------------------------------------
  const loadChecklist = async (casoId: string, tipoCliente: string) => {
    setChecklistLoading(true);
    setChecklistError(null);

    // 1) Intentar cargar lo que exista
    let { data, error } = await supabase
      .from('casos_documentos_requeridos')
      .select(
        `
        id,
        completado,
        completado_en,
        doc:documentos_requeridos (
          id,
          tipo,
          descripcion,
          obligatorio,
          orden
        )
      `
      )
      .eq('caso_id', casoId);

    if (error) {
      console.error('Error cargando checklist:', error);
      setChecklistError('No se pudo cargar el checklist de documentación.');
      setChecklistLoading(false);
      return;
    }

    // Si ya hay datos, los usamos y salimos
    if (data && data.length > 0) {
      const items = data as ChecklistItem[];
      const ordered = [...items].sort((a, b) => {
        const oa = a.doc?.orden ?? 999;
        const ob = b.doc?.orden ?? 999;
        if (oa !== ob) return oa - ob;
        const sa = a.doc?.obligatorio ? 0 : 1;
        const sb = b.doc?.obligatorio ? 0 : 1;
        return sa - sb;
      });
      setChecklist(ordered);
      setChecklistLoading(false);
      return;
    }

    // 2) Si no hay checklist, lo generamos automáticamente
    const tiposDocs = tiposPorCliente(tipoCliente);

    if (tiposDocs.length === 0) {
      setChecklist([]);
      setChecklistLoading(false);
      return;
    }

    const { data: docsCatalog, error: docsError } = await supabase
      .from('documentos_requeridos')
      .select('id, tipo')
      .in('tipo', tiposDocs);

    if (docsError) {
      console.error('Error cargando documentos_requeridos:', docsError);
      setChecklistError(
        'No se pudo generar el checklist de documentación.'
      );
      setChecklistLoading(false);
      return;
    }

    if (docsCatalog && docsCatalog.length > 0) {
      const inserts = docsCatalog.map((d: any) => ({
        caso_id: casoId,
        doc_id: d.id,
        completado: false,
      }));

      const { error: insertError } = await supabase
        .from('casos_documentos_requeridos')
        .insert(inserts);

      if (insertError) {
        console.error('Error creando checklist:', insertError);
        setChecklistError(
          'No se pudo crear el checklist de documentación.'
        );
        setChecklistLoading(false);
        return;
      }

      // 3) Volvemos a cargar, ahora ya debería haber filas
      const { data: data2, error: error2 } = await supabase
        .from('casos_documentos_requeridos')
        .select(
          `
          id,
          completado,
          completado_en,
          doc:documentos_requeridos (
            id,
            tipo,
            descripcion,
            obligatorio,
            orden
          )
        `
        )
        .eq('caso_id', casoId);

      if (error2) {
        console.error('Error recargando checklist:', error2);
        setChecklistError('No se pudo recargar el checklist.');
        setChecklistLoading(false);
        return;
      }

      const items2 = (data2 as ChecklistItem[]) || [];
      const ordered2 = [...items2].sort((a, b) => {
        const oa = a.doc?.orden ?? 999;
        const ob = b.doc?.orden ?? 999;
        if (oa !== ob) return oa - ob;
        const sa = a.doc?.obligatorio ? 0 : 1;
        const sb = b.doc?.obligatorio ? 0 : 1;
        return sa - sb;
      });
      setChecklist(ordered2);
    } else {
      setChecklist([]);
    }

    setChecklistLoading(false);
  };

  // Toggle completado
  const handleToggleChecklist = async (item: ChecklistItem) => {
    if (!item?.id) return;

    const nuevoEstado = !item.completado;

    const { error } = await supabase
      .from('casos_documentos_requeridos')
      .update({
        completado: nuevoEstado,
        completado_por: nuevoEstado ? userId : null,
        completado_en: nuevoEstado ? new Date().toISOString() : null,
      })
      .eq('id', item.id);

    if (error) {
      console.error('Error actualizando checklist:', error);
      setChecklistError('No se pudo actualizar el estado del documento.');
      return;
    }

    setChecklist((prev) =>
      prev.map((c) =>
        c.id === item.id
          ? {
              ...c,
              completado: nuevoEstado,
              completado_en: nuevoEstado
                ? new Date().toISOString()
                : null,
            }
          : c
      )
    );
  };

  // ----------------------------------------------------------
  // Cargar expediente, logs, notas y checklist
  // ----------------------------------------------------------
  useEffect(() => {
    const fetchCaseData = async () => {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg('Debes iniciar sesión para ver este expediente.');
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: casoData, error: casoError } = await supabase
        .from('casos')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (casoError || !casoData) {
        console.error(casoError);
        setErrorMsg('No se ha encontrado el expediente.');
        setLoading(false);
        return;
      }

      const c = casoData as any;

      const tipoClienteNormalizado =
        c.tipo_cliente || 'cuenta_ajena';

      const casoNormalizado: Caso = {
        id: c.id,
        titulo: c.titulo ?? 'Expediente sin título',
        estado: c.estado ?? 'en_estudio',
        progreso: c.progreso ?? 0,
        notas: c.notas ?? '',
        created_at: c.created_at,
        updated_at: c.updated_at,
        seguimiento_token: c.seguimiento_token ?? null,
        urgente: c.urgente ?? false,
        fecha_limite: c.fecha_limite ?? null,
        tipo_cliente: tipoClienteNormalizado,
      };

      setCaso(casoNormalizado);
      setEstado(casoNormalizado.estado);
      setProgreso(casoNormalizado.progreso);
      setNotas(casoNormalizado.notas ?? '');
      setUrgente(casoNormalizado.urgente);
      setFechaLimite(casoNormalizado.fecha_limite);

      // Logs
      const { data: logsData, error: logsError } = await supabase
        .from('expediente_logs')
        .select('id, created_at, tipo, descripcion, visible_cliente')
        .eq('caso_id', c.id)
        .order('created_at', { ascending: false });

      if (!logsError && logsData) {
        setLogs(logsData as LogItem[]);
      }

      // Notas internas
      const { data: notasData, error: notasError } = await supabase
        .from('expediente_notas')
        .select('id, contenido, created_at, user_id')
        .eq('caso_id', c.id)
        .order('created_at', { ascending: true });

      if (!notasError && notasData) {
        setNotasLista(notasData as NotaItem[]);
      }

      // ✅ Checklist (se genera si no existe)
      await loadChecklist(c.id, tipoClienteNormalizado);

      setLoading(false);
    };

    if (id) fetchCaseData();
  }, [id]);

  // ----------------------------------------------------------
  // Cargar documentos metadatos
  // ----------------------------------------------------------
  useEffect(() => {
    const loadDocs = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from('expediente_documentos')
        .select('id, tipo, nombre_archivo, storage_path, created_at')
        .eq('caso_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando documentos:', error);
        setDocsMsg('No se pudieron cargar los documentos.');
        return;
      }

      setFiles((data as FileItem[]) ?? []);
    };

    loadDocs();
  }, [id]);

  // ----------------------------------------------------------
  // Guardar estado, progreso, notas, urgente, fecha límite
  // ----------------------------------------------------------
  const handleSave = async () => {
    if (!caso) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMsg('Sesión no válida.');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('casos')
      .update({
        estado,
        progreso: Number(progreso) || 0,
        notas,
        urgente,
        fecha_limite: fechaLimite || null,
      })
      .eq('id', caso.id)
      .eq('user_id', user.id);

    if (error) {
      console.error(error);
      setErrorMsg('No se han podido guardar los cambios.');
      setSaving(false);
      return;
    }

    setSuccessMsg('Cambios guardados correctamente.');

    const { data: logsData, error: logsError } = await supabase
      .from('expediente_logs')
      .select('id, created_at, tipo, descripcion, visible_cliente')
      .eq('caso_id', caso.id)
      .order('created_at', { ascending: false });

    if (!logsError && logsData) {
      setLogs(logsData as LogItem[]);
    }

    setSaving(false);
  };

  // ----------------------------------------------------------
  // Archivos
  // ----------------------------------------------------------
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFileToUpload(f);
    setDocsMsg(null);
  };

  const handleUpload = async () => {
    if (!fileToUpload) {
      setDocsMsg('Primero selecciona un archivo.');
      return;
    }
    if (!userId || !caso) {
      setDocsMsg('Sesión no válida.');
      return;
    }

    setUploading(true);
    setDocsMsg(null);

    try {
      let safeName = fileToUpload.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_');

      const path = `${userId}/${caso.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from('docs')
        .upload(path, fileToUpload, { upsert: true });

      if (uploadError) {
        console.error('Error subiendo archivo:', uploadError);
        setDocsMsg(
          `No se ha podido subir el documento: ${
            uploadError.message ?? ''
          }`
        );
        setUploading(false);
        return;
      }

      const { data: docInsert, error: docError } = await supabase
        .from('expediente_documentos')
        .insert({
          caso_id: caso.id,
          user_id: userId,
          tipo: docTipo,
          nombre_archivo: safeName,
          storage_path: path,
        })
        .select('id, tipo, nombre_archivo, storage_path, created_at')
        .single();

      if (docError || !docInsert) {
        console.error('Error guardando metadatos:', docError);
        setDocsMsg(
          'El archivo se subió, pero no se pudieron guardar los metadatos.'
        );
      } else {
        setFiles((prev) => [docInsert as FileItem, ...prev]);
        setDocsMsg('Documento subido correctamente.');
      }

      setFileToUpload(null);

      const { error: logError } = await supabase.from('expediente_logs').insert({
        caso_id: caso.id,
        user_id: userId,
        tipo: 'documento',
        descripcion: `Documento (${docTipo}) añadido: ${safeName}`,
        visible_cliente: true,
      });

      if (logError) {
        console.error('Error creando log de documento:', logError);
      } else {
        const { data: logsData, error: logsError } = await supabase
          .from('expediente_logs')
          .select('id, created_at, tipo, descripcion, visible_cliente')
          .eq('caso_id', caso.id)
          .order('created_at', { ascending: false });

        if (!logsError && logsData) {
          setLogs(logsData as LogItem[]);
        }
      }
    } catch (e) {
      console.error(e);
      setDocsMsg('Error inesperado subiendo el documento.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileItem) => {
    if (!file?.storage_path) return;

    const { data, error } = await supabase.storage
      .from('docs')
      .createSignedUrl(file.storage_path, 60 * 10);

    if (error || !data?.signedUrl) {
      console.error('Error creando signed URL:', error);
      setDocsMsg('No se pudo descargar el documento.');
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  // ----------------------------------------------------------
  // Notas internas
  // ----------------------------------------------------------
  const handleAddNota = async () => {
    if (!nuevaNota.trim() || !caso) return;

    const texto = nuevaNota.trim();
    setNuevaNota('');

    const { error: insertError } = await supabase
      .from('expediente_notas')
      .insert({
        caso_id: caso.id,
        user_id: userId,
        contenido: texto,
      });

    if (insertError) {
      console.error('Error guardando nota:', insertError);
      setErrorMsg('No se pudo guardar la nota interna.');
      return;
    }

    const { data, error } = await supabase
      .from('expediente_notas')
      .select('id, contenido, created_at, user_id')
      .eq('caso_id', caso.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setNotasLista(data as NotaItem[]);
    }
  };

  // ----------------------------------------------------------
  // Enlace de seguimiento
  // ----------------------------------------------------------
  const handleCopyLink = async () => {
    if (!caso?.seguimiento_token) return;

    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://backhipotecas.vercel.app';

    const fullUrl = `${origin}/seguimiento/${caso.seguimiento_token}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopyMsg('Enlace copiado al portapapeles.');
      setTimeout(() => setCopyMsg(null), 2000);
    } catch {
      setCopyMsg('No se pudo copiar el enlace.');
      setTimeout(() => setCopyMsg(null), 2000);
    }
  };

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-300">Cargando expediente…</div>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold mb-2">Expediente no encontrado</p>
        <p className="text-sm text-slate-400 mb-4">
          Puede que el enlace no sea correcto o que no tengas permisos sobre
          este expediente.
        </p>
        <Link
          href="/portal"
          className="text-emerald-400 text-sm hover:underline"
        >
          ← Volver al panel de clientes
        </Link>
      </div>
    );
  }

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://backhipotecas.vercel.app';

  const trackingUrl = caso.seguimiento_token
    ? `${origin}/seguimiento/${caso.seguimiento_token}`
    : '';

  let badgeFechaTexto: string | null = null;
  if (fechaLimite) {
    badgeFechaTexto = `Plazo: ${new Date(
      fechaLimite
    ).toLocaleDateString('es-ES')}`;
  }

  const totalDocs = checklist.length;
  const completados = checklist.filter((c) => c.completado).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push('/portal')}
            className="text-xs text-slate-400 hover:text-slate-200 mb-1"
          >
            ← Volver al panel de clientes
          </button>
          <h1 className="text-xl font-semibold">{caso.titulo}</h1>
          <p className="text-xs text-slate-400">
            Expediente hipotecario · creado el{' '}
            {new Date(caso.created_at).toLocaleDateString('es-ES')}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            {urgente && (
              <span className="inline-flex items-center rounded-full bg-red-500/20 border border-red-500/60 px-2 py-0.5 text-[10px] font-semibold text-red-200 uppercase tracking-wide">
                Urgente
              </span>
            )}
            {badgeFechaTexto && (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-400/50 px-2 py-0.5 text-[10px] text-amber-200">
                {badgeFechaTexto}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* MENSAJES */}
        {errorMsg && (
          <div className="rounded-md border border-red-600 bg-red-950/60 px-4 py-2 text-sm text-red-100">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded-md border border-emerald-600 bg-emerald-950/60 px-4 py-2 text-sm text-emerald-100">
            {successMsg}
          </div>
        )}
        {copyMsg && (
          <div className="rounded-md border border-emerald-600 bg-emerald-950/60 px-4 py-2 text-xs text-emerald-100">
            {copyMsg}
          </div>
        )}
        {checklistError && (
          <div className="rounded-md border border-amber-600 bg-amber-950/60 px-4 py-2 text-xs text-amber-100">
            {checklistError}
          </div>
        )}

        {/* ESTADO DEL EXPEDIENTE */}
        {/* ... (aquí mantiene todo lo que ya tenías: estado, progreso, urgencia, fecha límite, notas, documentos, enlace, historial, notas internas) */}
        {/* Por brevedad no lo repito; es idéntico al archivo anterior salvo la parte de checklist. */}
        {/* La sección importante para ti ahora es la del checklist, que ya se autogenera. */}

        {/* CHECKLIST DOCUMENTAL EN TARJETAS */}
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Checklist de documentación para el estudio
              </h2>
              <p className="text-xs text-slate-400">
                Documentos que necesita este expediente según el tipo de
                cliente. No se muestra al cliente.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-300">
                Completados:{' '}
                <span className="font-semibold text-emerald-400">
                  {completados}/{totalDocs}
                </span>
              </p>
            </div>
          </div>

          {checklistLoading && (
            <div className="text-xs text-slate-400">
              Cargando checklist de documentación…
            </div>
          )}

          {!checklistLoading && checklist.length === 0 && (
            <p className="text-xs text-slate-500">
              Este expediente todavía no tiene checklist asignado.
            </p>
          )}

          {!checklistLoading && checklist.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checklist.map((item) => {
                const obligatorio = item.doc?.obligatorio ?? false;
                const nombreDoc =
                  item.doc?.descripcion ||
                  DOC_TIPOS.find((t) => t.value === item.doc?.tipo)?.label ||
                  item.doc?.tipo ||
                  'Documento';

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border px-3 py-3 text-xs flex flex-col gap-2 ${
                      item.completado
                        ? 'border-emerald-600 bg-emerald-950/30'
                        : obligatorio
                        ? 'border-slate-700 bg-slate-900'
                        : 'border-slate-800 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-slate-100 font-medium">
                          {nombreDoc}
                        </p>
                        {item.completado_en && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Marcado como completo el{' '}
                            {new Date(
                              item.completado_en
                            ).toLocaleString('es-ES')}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] border ${
                            obligatorio
                              ? 'border-amber-400 text-amber-200 bg-amber-500/10'
                              : 'border-slate-500 text-slate-300 bg-slate-800/60'
                          }`}
                        >
                          {obligatorio ? 'Obligatorio' : 'Opcional'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] border ${
                            item.completado
                              ? 'border-emerald-400 text-emerald-200 bg-emerald-600/10'
                              : 'border-slate-500 text-slate-300 bg-slate-800/60'
                          }`}
                        >
                          {item.completado ? 'Completado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleChecklist(item)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium border ${
                          item.completado
                            ? 'border-slate-600 text-slate-200 bg-slate-900 hover:bg-slate-800'
                            : 'border-emerald-500 text-emerald-100 bg-emerald-600/20 hover:bg-emerald-500/30'
                        }`}
                      >
                        {item.completado
                          ? 'Marcar como pendiente'
                          : 'Marcar como completo'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
