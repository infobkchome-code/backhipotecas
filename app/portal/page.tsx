'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type CaseItem = {
  id: string;
  dni?: string | null;
  telefono?: string | null;
  email?: string | null;
  estado?: string | null;
  created_at?: string | null;
  seguimiento_token?: string | null;
  titulo?: string | null;
  [key: string]: any; // resto de columnas que vengan de Supabase
};

type ApiResponse = {
  data?: CaseItem[];
  cases?: CaseItem[];
  casos?: CaseItem[];
};

// Detecta el "nombre" más razonable que tengamos para mostrar
function getNombre(item: CaseItem): string {
  // 1) Campos típicos de nombre
  const directName =
    item.nombre ??
    item.cliente_nombre ??
    item.nombre_cliente ??
    item.nombre_y_apellidos ??
    item.nombre_apellidos ??
    item.titular;

  if (directName) return String(directName).trim();

  // 2) Si no hay nombre, usamos el título del expediente
  if (item.titulo) return String(item.titulo).trim();

  // 3) Si tampoco hay título, usamos el email si existe
  if (item.email) return String(item.email).trim();

  // 4) Último recurso: “Expediente {id}”
  return `Expediente ${item.id}`;
}

export default function PortalPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/portal/cases/list', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`Error al cargar los expedientes (${res.status})`);
        }

        const json: ApiResponse | CaseItem[] = await res.json();

        let loaded: CaseItem[] = [];
        if (Array.isArray(json)) {
          loaded = json;
        } else if (json.data) {
          loaded = json.data;
        } else if (json.cases) {
          loaded = json.cases;
        } else if (json.casos) {
          loaded = json.casos;
        }

        setCases(loaded);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? 'Error inesperado al cargar los expedientes');
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, []);

  const filteredCases = useMemo(() => {
    if (!search.trim()) return cases;

    const term = search.toLowerCase();

    return cases.filter((item) => {
      const nombre = getNombre(item).toLowerCase();
      const dni = (item.dni
