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
  tipo_cliente: string | null;
  // 👇 datos configurables
  cliente_nombre?: string | null;
  cliente_email?: string | null;
  cliente_telefono?: string | null;
  banco_principal?: string | null;
  importe_solicitado?: number | null;
  importe_aprobado?: number | null;
  tipo_interes?: number | null;
  plazo_anios?: number | null;
  cuota_aprox?: number | null;
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

type ChecklistItem = {
  id: string;
  completado: boolean;
  completado_en: string | null;
  habilitar_cliente: boolean | null;
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

  // estado expediente
  const [estado, setEstado] = useState('en_estudio');
  const [progreso, setProgreso] = useState(0);
  const [notas, setNotas] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [fechaLimite, setFechaLimite] = useState<string | null>(null);

  // 👇 datos del cliente / operación (editables)
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [bancoPrincipal, setBancoPrincipal] = useState('');
  const [importeSolicitado, setImporteSolicitado] = useState('');
  const [importeAprobado, setImporteAprobado] = useState('');
  const [tipoInteres, setTipoInteres] = useState('');
  const [plazoAnios, setPlazoAnios] = useState('');
  const [cuotaAprox, setCuotaAprox] = useState('');

  const [files, setFiles] = useState<FileItem[]>([]);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [docTipo, setDocTipo] = useState('otros');
  const [uploading, setUploading] = useState(false);
  const [docsMsg, setDocsMsg] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [notasLista, setNotasLista] = useState<NotaItem[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');

  const [userId, setUserId] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  // ----------------- helpers -----------------

  const tiposPorCliente = (tipo: string | null): string[] => {
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

    return [
      'dni',
      'nominas',
      'contrato_trabajo',
      'vida_laboral',
      'renta',
      'extractos',
    ];
  };

  const loadChecklist = async (casoId: string, tipoCliente: string | null) => {
    setChecklistLoading(true);
    setChecklistError(null);

    let { data, error } = await supabase
      .from('casos_documentos_requeridos')
      .select(
        `
        id,
        completado,
        completado_en,
        habilitar_cliente,
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
      setChecklistError('No se pudo generar el checklist de documentación.');
      setChecklistLoading(false);
      return;
    }

    if (docsCatalog && docsCatalog.length > 0) {
      const inserts = docsCatalog.map((d: any) => ({
        caso_id: casoId,
        doc_id: d.id,
        completado: false,
        habilitar_cliente: true,
      }));

      const { error: insertError } = await supabase
        .from('casos_documentos_requeridos')
        .insert(inserts);

      if (insertError) {
        console.error('Error creando checklist:', insertError);
        setChecklistError('No se pudo crear el checklist de documentación.');
        setChecklistLoading(false);
        return;
      }

      const { data: data2, error: error2 } = await supabase
        .from('casos_documentos_requeridos')
        .select(
          `
          id,
          completado,
          completado_en,
          habilitar_cliente,
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

  const handleToggleChecklist = async (item: ChecklistItem) => {
    if (!item?.id) return;

    const nuevoEstado = !item.completado;

    const { error } = await supabase
      .from('casos_documentos_requeridos')
      .update({
        completado: nuevoEstado,
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
              completado_en: nuevoEstado ? new Date().toISOString() : null,
            }
          : c
      )
    );
  };

  const handleToggleClienteUpload = async (item: ChecklistItem) => {
    if (!item?.id) return;

    const nuevo = !item.habilitar_cliente;

    const { error } = await supabase
      .from('casos_documentos_requeridos')
      .update({ habilitar_cliente: nuevo })
      .eq('id', item.id);

    if (error) {
      console.error('Error cambiando habilitación cliente:', error);
      setChecklistError('No se pudo actualizar la configuración del cliente.');
      return;
    }

    setChecklist((prev) =>
      prev.map((c) =>
        c.id === item.id ? { ...c, habilitar_cliente: nuevo } : c
      )
    );
  };

  // -------- cargar caso, logs, notas, checklist (sin exigir login para ver) --------
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      const idParam = id;

      if (!idParam) {
        setErrorMsg('No se ha encontrado el ID del expediente.');
        setLoading(false);
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUserId(user?.id ?? null);
      } catch (_) {
        setUserId(null);
      }

      const { data, error } = await supabase
        .from('casos')
        .select(`
          id,
          titulo,
          estado,
          progreso,
          notas,
          urgente,
          fecha_limite,
          created_at,
          updated_at,
          tipo_cliente,
          seguimiento_token,
          cliente_nombre,
          cliente_email,
          cliente_telefono,
          banco_principal,
          importe_solicitado,
          importe_aprobado,
          tipo_interes,
          plazo_anios,
          cuota_aprox
        `)
        .eq('id', idParam)
        .single();

      if (error || !data) {
        console.error('Error cargando expediente:', error);
        setErrorMsg('No se ha podido cargar el expediente.');
        setLoading(false);
        return;
      }

      const c = data as any;
      const tipoClienteNorm = c.tipo_cliente ?? 'cuenta_ajena';

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
        tipo_cliente: tipoClienteNorm,
        cliente_nombre: c.cliente_nombre ?? null,
        cliente_email: c.cliente_email ?? null,
        cliente_telefono: c.cliente_telefono ?? null,
        banco_principal: c.banco_principal ?? null,
        importe_solicitado: c.importe_solicitado ?? null,
        importe_aprobado: c.importe_aprobado ?? null,
        tipo_interes: c.tipo_interes ?? null,
        plazo_anios: c.plazo_anios ?? null,
        cuota_aprox: c.cuota_aprox ?? null,
      };

      setCaso(casoNormalizado);
      setEstado(casoNormalizado.estado);
      setProgreso(casoNormalizado.progreso);
      setNotas(casoNormalizado.notas ?? '');
      setUrgente(casoNormalizado.urgente);
      setFechaLimite(casoNormalizado.fecha_limite);

      // inicializar datos editables
      setClienteNombre(casoNormalizado.cliente_nombre ?? '');
      setClienteEmail(casoNormalizado.cliente_email ?? '');
      setClienteTelefono(casoNormalizado.cliente_telefono ?? '');
      setBancoPrincipal(casoNormalizado.banco_principal ?? '');
      setImporteSolicitado(
        casoNormalizado.importe_solicitado != null
          ? String(casoNormalizado.importe_solicitado)
          : ''
      );
      setImporteAprobado(
        casoNormalizado.importe_aprobado != null
          ? String(casoNormalizado.importe_aprobado)
          : ''
      );
      setTipoInteres(
        casoNormalizado.tipo_interes != null
          ? String(casoNormalizado.tipo_interes)
          : ''
      );
      setPlazoAnios(
        casoNormalizado.plazo_anios != null
          ? String(casoNormalizado.plazo_anios)
          : ''
      );
      setCuotaAprox(
        casoNormalizado.cuota_aprox != null
          ? String(casoNormalizado.cuota_aprox)
          : ''
      );

      const { data: logsData, error: logsError } = await supabase
        .from('expediente_logs')
        .select('id, created_at, tipo, descripcion, visible_cliente')
        .eq('caso_id', c.id)
        .order('created_at', { ascending: false });

      if (!logsError && logsData) {
        setLogs(logsData as LogItem[]);
      }

      const { data: notasData, error: notasError } = await supabase
        .from('expediente_notas')
        .select('id, contenido, created_at, user_id')
        .eq('caso_id', c.id)
        .order('created_at', { ascending: true });

      if (!notasError && notasData) {
        setNotasLista(notasData as NotaItem[]);
      }

      await loadChecklist(c.id, tipoClienteNorm);

      setLoading(false);
    };

    if (id) load();
  }, [id]);

  // -------- cargar documentos --------
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
        cliente_nombre: clienteNombre || null,
        cliente_email: clienteEmail || null,
        cliente_telefono: clienteTelefono || null,
        banco_principal: bancoPrincipal || null,
        importe_solicitado: importeSolicitado
          ? Number(importeSolicitado)
          : null,
        importe_aprobado: importeAprobado ? Number(importeAprobado) : null,
        tipo_interes: tipoInteres ? Number(tipoInteres) : null,
        plazo_anios: plazoAnios ? Number(plazoAnios) : null,
        cuota_aprox: cuotaAprox ? Number(cuotaAprox) : null,
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

      const itemsToMark = checklist.filter(
        (item) => item.doc?.tipo === docTipo && !item.completado
      );

      for (const item of itemsToMark) {
        await handleToggleChecklist(item);
      }
    } catch (e) {
      console.error(e);
      setDocsMsg('Error inesperado subiendo el documento.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (file: FileItem) => {
    if (!file?.storage_path) {
      setDocsMsg('Ruta de archivo no válida.');
      return;
    }

    const { data } = supabase.storage.from('docs').getPublicUrl(file.storage_path);

    if (!data?.publicUrl) {
      setDocsMsg('No se pudo generar la URL de descarga.');
      return;
    }

    window.open(data.publicUrl, '_blank');
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center">
        <div className="text-sm">Cargando expediente…</div>
      </div>
    );
  }

  if (!caso) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center px-4">
        <p className="text-lg font-semibold mb-2">Expediente no encontrado</p>
        <p className="text-sm text-slate-500 mb-4">
          Puede que el enlace no sea correcto o que no tengas permisos sobre este expediente.
        </p>
        <Link
          href="/portal"
          className="text-emerald-600 text-sm hover:underline"
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

  const totalDocs = checklist.length;
  const completados = checklist.filter((c) => c.completado).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              onClick={() => router.push('/portal')}
              className="text-xs text-slate-500 hover:text-slate-700 mb-1"
            >
              ← Volver al panel de expedientes
            </button>

            <h1 className="text-lg sm:text-xl font-semibold text-slate-900">
              {caso.titulo}
            </h1>
            <p className="text-xs text-slate-500">
              Expediente hipotecario · creado el{' '}
              {new Date(caso.created_at).toLocaleDateString('es-ES')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/portal/case/${caso.id}/chat`}
              className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500"
            >
              💬 Chat con cliente
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6">
        {/* ALERTAS */}
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {successMsg}
          </div>
        )}
        {copyMsg && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
            {copyMsg}
          </div>
        )}
        {checklistError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
            {checklistError}
          </div>
        )}

        {/* DATOS DEL CLIENTE Y OPERACIÓN */}
        <section className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Datos del cliente y de la operación
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={clienteTelefono}
                  onChange={(e) => setClienteTelefono(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Banco principal
                </label>
                <input
                  type="text"
                  value={bancoPrincipal}
                  onChange={(e) => setBancoPrincipal(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Importe solicitado (€)
                  </label>
                  <input
                    type="number"
                    value={importeSolicitado}
                    onChange={(e) => setImporteSolicitado(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Importe aprobado (€)
                  </label>
                  <input
                    type="number"
                    value={importeAprobado}
                    onChange={(e) => setImporteAprobado(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Tipo interés (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tipoInteres}
                    onChange={(e) => setTipoInteres(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Plazo (años)
                  </label>
                  <input
                    type="number"
                    value={plazoAnios}
                    onChange={(e) => setPlazoAnios(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Cuota aprox. (€)
                  </label>
                  <input
                    type="number"
                    value={cuotaAprox}
                    onChange={(e) => setCuotaAprox(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ESTADO DEL EXPEDIENTE */}
        <section className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
            <span>Estado del expediente</span>
            {urgente && (
              <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                ¡Urgente!
              </span>
            )}
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {ESTADOS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Progreso aproximado (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={progreso}
                  onChange={(e) => setProgreso(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-emerald-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, progreso))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs text-slate-700 mt-1">
                <input
                  type="checkbox"
                  checked={urgente}
                  onChange={(e) => setUrgente(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Marcar expediente como urgente</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Fecha límite interna
                </label>
                <input
                  type="date"
                  value={fechaLimite ?? ''}
                  onChange={(e) =>
                    setFechaLimite(e.target.value ? e.target.value : null)
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nota interna de resumen
            </label>
            <textarea
              rows={4}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ej.: FEIN emitida, tasación en curso, pendiente de documentación, etc."
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.push('/portal')}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </section>

        {/* DOCUMENTOS (ARCHIVOS) */}
        <section className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Documentación del expediente (archivos)
          </h2>

          {docsMsg && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-700">
              {docsMsg}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tipo de documento
              </label>
              <select
                value={docTipo}
                onChange={(e) => setDocTipo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {DOC_TIPOS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              <input
                type="file"
                onChange={handleFileChange}
                className="text-xs text-slate-600"
              />
              <button
                type="button"
                onClick={handleUpload}
                disabled={!fileToUpload || uploading}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Subiendo…' : 'Subir documento'}
              </button>
            </div>
          </div>

          <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Nombre del archivo
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Fecha de alta
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {files.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-3 text-center text-slate-500"
                    >
                      Aún no hay documentos subidos.
                    </td>
                  </tr>
                )}

                {files.map((f) => {
                  const tipoLabel =
                    DOC_TIPOS.find((t) => t.value === f.tipo)?.label || f.tipo;

                  return (
                    <tr
                      key={f.id}
                      className="border-t border-slate-200 hover:bg-slate-50"
                    >
                      <td className="px-3 py-2 text-slate-900">
                        {tipoLabel}
                      </td>
                      <td className="px-3 py-2 text-slate-900 break-all">
                        {f.nombre_archivo}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {f.created_at
                          ? new Date(f.created_at).toLocaleString('es-ES')
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(f)}
                          className="text-emerald-600 hover:underline"
                        >
                          Descargar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* CHECKLIST DOCUMENTAL */}
        <section className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Checklist de documentación para el estudio
              </h2>
              <p className="text-xs text-slate-500">
                Aquí defines qué documentos necesita este expediente y si el
                cliente puede subirlos desde su portal.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">
                Completados:{' '}
                <span className="font-semibold text-emerald-600">
                  {completados}/{totalDocs}
                </span>
              </p>
            </div>
          </div>

          {checklistLoading && (
            <div className="text-xs text-slate-500">
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

                const habilitado = item.habilitar_cliente ?? false;

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border px-3 py-3 text-xs flex flex-col gap-2 ${
                      item.completado
                        ? 'border-emerald-200 bg-emerald-50'
                        : obligatorio
                        ? 'border-slate-200 bg-slate-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-slate-900 font-medium">
                          {nombreDoc}
                        </p>
                        {item.completado_en && (
                          <p className="text-[10px] text-slate-500 mt-1">
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
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'border-slate-300 text-slate-600 bg-slate-50'
                          }`}
                        >
                          {obligatorio ? 'Obligatorio' : 'Opcional'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] border ${
                            item.completado
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : 'border-slate-300 text-slate-600 bg-slate-50'
                          }`}
                        >
                          {item.completado ? 'Completado' : 'Pendiente'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleClienteUpload(item)}
                          className={`mt-1 px-2 py-0.5 rounded-full text-[10px] border ${
                            habilitado
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : 'border-slate-300 text-slate-500 bg-slate-50'
                          }`}
                        >
                          Cliente:{' '}
                          {habilitado ? 'puede subir' : 'no puede subir'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleToggleChecklist(item)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium border ${
                          item.completado
                            ? 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                            : 'border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
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

        {/* ENLACE SEGUIMIENTO */}
        <section className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 sm:p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-emerald-900">
            Enlace de seguimiento para el cliente
          </h2>
          {caso.seguimiento_token ? (
            <>
              <p className="text-xs text-emerald-800/80">
                Copia este enlace o pulsa “Ver como cliente” para verlo tal y
                como lo ve el cliente.
              </p>
              <div className="bg-white border border-emerald-200 rounded-md px-3 py-2 text-xs break-all text-emerald-900">
                {trackingUrl}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-md border border-emerald-300 text-xs text-emerald-800 bg-white hover:bg-emerald-50"
                >
                  Copiar enlace
                </button>
                <Link
                  href={`/seguimiento/${caso.seguimiento_token}`}
                  target="_blank"
                  className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-500"
                >
                  Ver como cliente
                </Link>
              </div>
            </>
          ) : (
            <p className="text-xs text-emerald-800/80">
              Aún no hay enlace de seguimiento generado para este expediente.
            </p>
          )}
        </section>

        {/* HISTORIAL */}
        <section className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Historial del expediente (solo interno)
          </h2>
          <p className="text-xs text-slate-500">
            Aquí se registran automáticamente los cambios de estado, progreso,
            notas y documentación. No es visible para el cliente.
          </p>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-500">
              Aún no hay movimientos registrados para este expediente.
            </p>
          ) : (
            <ul className="space-y-2 text-xs">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                  <div>
                    <div className="text-slate-800">
                      {log.descripcion || log.tipo}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {new Date(log.created_at).toLocaleString('es-ES')}{' '}
                      {log.visible_cliente
                        ? '· Visible para cliente'
                        : '· Solo interno'}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* NOTAS INTERNAS */}
        <section className="rounded-xl bg-white border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3 mb-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Notas internas del gestor
          </h2>
          <p className="text-xs text-slate-500">
            Conversación interna sobre el expediente. Sólo la ves tú y tu
            equipo, nunca el cliente.
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {notasLista.length === 0 && (
              <p className="text-xs text-slate-500">
                Todavía no hay notas internas.
              </p>
            )}

            {notasLista.map((nota) => (
              <div
                key={nota.id}
                className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-900 border border-slate-100"
              >
                <p>{nota.contenido}</p>
                <p className="text-[10px] text-slate-500 mt-1">
                  {new Date(nota.created_at).toLocaleString('es-ES')}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="text"
              value={nuevaNota}
              onChange={(e) => setNuevaNota(e.target.value)}
              placeholder="Escribe una nota interna…"
              className="flex-1 rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddNota}
              disabled={!nuevaNota.trim()}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Añadir nota
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
