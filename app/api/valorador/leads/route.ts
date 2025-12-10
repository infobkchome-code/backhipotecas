import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  const status = (searchParams.get("status") || "").trim(); // new | contacted | discarded | ...
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const sb = supabaseAdmin();

  // Base query
  let query = sb
    .from("leads_valorador")
    .select(
      "id,created_at,source,status,processed_at,processed_note,name,phone,email,address,city,type,size_m2,bedrooms,bathrooms,has_garage,has_terrace,condition,result_min,result_max,lat,lon,utm,property,contact,result,ip,user_agent",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  // Búsqueda simple (por columnas si existen). Si no existen, igual tienes JSON en contact/property.
  if (q) {
    // OJO: "or" admite filtros sobre columnas; si no tienes name/phone/email, quítalos.
    query = query.or(
      `name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [], count: count ?? 0 });
}

export async function POST(req: Request) {
  const sb = supabaseAdmin();

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body?.id || "");
  const nextStatus = String(body?.status || "");
  const note = body?.note ? String(body.note) : null;

  if (!id || !nextStatus) {
    return NextResponse.json({ ok: false, error: "Missing id/status" }, { status: 400 });
  }

  const patch: any = {
    status: nextStatus,
    processed_note: note,
  };

  // Si pasa a estado “gestionado”, guardamos processed_at
  if (nextStatus !== "new") patch.processed_at = new Date().toISOString();

  const { error } = await sb.from("leads_valorador").update(patch).eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
