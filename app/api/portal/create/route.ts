// app/api/portal/create/route.ts

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      userId,
      nombre,
      email,
      telefono,
      notas,
      titulo,
      tipo_cliente,   // ⬅️ NUEVO
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    }

    if (!nombre || !email) {
      return NextResponse.json(
        { error: "Faltan datos del cliente" },
        { status: 400 }
      );
    }

    // 1) CREAR EL CLIENTE
    const { data: cliente, error: errorCliente } = await supabase
      .from("clientes")
      .insert([
        {
          user_id_uuid: userId,
          nombre,
          email,
          telefono: telefono || null,
        },
      ])
      .select()
      .single();

    if (errorCliente) {
      console.error("Error creando cliente:", errorCliente);
      return NextResponse.json(
        { error: "Error creando cliente" },
        { status: 500 }
      );
    }

    // 2) GENERAR TOKEN DE SEGUIMIENTO
    const seguimientoToken = randomUUID();

    // 3) CREAR EL CASO
    const { data: caso, error: errorCaso } = await supabase
      .from("casos")
      .insert([
        {
          user_id_uuid: userId,
          client_id_uuid: cliente.id,
          titulo: titulo || `Expediente ${nombre}`,
          estado: "en_estudio",
          progreso: 0,
          notas_internas: notas || "",
          seguimiento_token: seguimientoToken,
          tipo_cliente: tipo_cliente || "cuenta_ajena", // ⬅️ NUEVO
        },
      ])
      .select()
      .single();

    if (errorCaso) {
      console.error("Error creando caso:", errorCaso);
      return NextResponse.json(
        { error: "Error creando caso" },
        { status: 500 }
      );
    }

    // 4) GENERAR CHECKLIST AUTOMÁTICO SEGÚN TIPO DE CLIENTE
    let documentos_requeridos: string[] = [];

    if (caso.tipo_cliente === "cuenta_ajena") {
      documentos_requeridos = [
        "dni",
        "nominas",
        "contrato_trabajo",
        "vida_laboral",
        "renta",
        "extractos",
      ];
    }

    if (caso.tipo_cliente === "autonomo") {
      documentos_requeridos = [
        "dni",
        "renta",
        "vida_laboral",
        "modelo_130",
        "modelo_303",
        "modelo_390",
        "modelo_347",
        "libro_ingresos_gastos",
        "extractos",
      ];
    }

    if (caso.tipo_cliente === "mixto") {
      documentos_requeridos = [
        "dni",
        "nominas",
        "contrato_trabajo",
        "renta",
        "vida_laboral",
        "modelo_130",
        "modelo_303",
        "modelo_390",
        "modelo_347",
        "extractos",
        "libro_ingresos_gastos",
      ];
    }

    if (caso.tipo_cliente === "empresa") {
      documentos_requeridos = [
        "dni",
        "renta",
        "escrituras",
        "cif",
        "cuentas_anuales",
        "balance",
        "certificados_aeat",
        "cert_ss",
        "extractos",
      ];
    }

    if (caso.tipo_cliente === "otros") {
      documentos_requeridos = ["documento_ingresos_especiales"];
    }

    // 5) BUSCAR LOS ID EN documentos_requeridos
    const { data: docsBD, error: docsError } = await supabase
      .from("documentos_requeridos")
      .select("id, tipo")
      .in("tipo", documentos_requeridos);

    if (docsError) {
      console.error("Error cargando documentos requeridos:", docsError);
      return NextResponse.json(
        { error: "Error cargando documentos requeridos" },
        { status: 500 }
      );
    }

    // 6) INSERTAR EL CHECKLIST en casos_documentos_requeridos
    if (docsBD && docsBD.length > 0) {
      const inserts = docsBD.map((d) => ({
        caso_id: caso.id,
        doc_id: d.id,
        completado: false,
      }));

      const { error: insertChecklistError } = await supabase
        .from("casos_documentos_requeridos")
        .insert(inserts);

      if (insertChecklistError) {
        console.error("Error creando checklist:", insertChecklistError);
      }
    }

    // 7) RESPUESTA FINAL
    return NextResponse.json(
      {
        ok: true,
        cliente,
        caso,
        seguimiento_url: `https://backhipotecas.vercel.app/seguimiento/${seguimientoToken}`,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("ERROR en /api/portal/create:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
