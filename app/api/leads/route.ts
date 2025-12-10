import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  // ✅ Token “buzón” para que SOLO tu web pueda enviar leads
  const token = req.headers.get("x-leads-token") || "";
  if (!process.env.LEADS_INGEST_TOKEN || token !== process.env.LEADS_INGEST_TOKEN) {
    return bad("Unauthorized", 401);
  }

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid JSON");

  const lead = {
    source: body.source ?? "web",
    status: "new",
    name: (body.name ?? "").toString().slice(0, 120),
    phone: (body.phone ?? "").toString().slice(0, 30),
    email: (body.email ?? "").toString().slice(0, 180),

    address: (body.address ?? "").toString().slice(0, 240),
    city: (body.city ?? "").toString().slice(0, 120),
    m2: body.m2 ? Number(body.m2) : null,
    condition: (body.condition ?? "").toString().slice(0, 40),
    has_garage: body.has_garage ?? null,
    has_terrace: body.has_terrace ?? null,

    utm_source: (body.utm_source ?? "").toString().slice(0, 120),
    utm_campaign: (body.utm_campaign ?? "").toString().slice(0, 120),
    utm_medium: (body.utm_medium ?? "").toString().slice(0, 120),
    utm_content: (body.utm_content ?? "").toString().slice(0, 120),
  };

  if (!lead.phone && !lead.email) return bad("Falta teléfono o email");
  if (!lead.city) return bad("Falta municipio");

  const sb = supabaseAdmin();
  const { data, error } = await sb.from("leads").insert(lead).select("id").single();

  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true, id: data.id });
}

export async function GET(req: Request) {
  // ✅ Por ahora también con token (simple).
  // Luego lo cambiamos a “solo logueado” cuando conectemos tu auth del CRM.
  const token = req.headers.get("x-leads-token") || "";
  if (!process.env.LEADS_INGEST_TOKEN || token !== process.env.LEADS_INGEST_TOKEN) {
    return bad("Unauthorized", 401);
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "new";

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("leads")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true, leads: data ?? [] });
}

export async function PATCH(req: Request) {
  const token = req.headers.get("x-leads-token") || "";
  if (!process.env.LEADS_INGEST_TOKEN || token !== process.env.LEADS_INGEST_TOKEN) {
    return bad("Unauthorized", 401);
  }

  const body = await req.json().catch(() => null);
  const id = body?.id;
  const status = body?.status;

  if (!id) return bad("Falta id");
  if (!["new", "contacted", "qualified", "lost"].includes(status)) return bad("Estado inválido");

  const sb = supabaseAdmin();
  const { error } = await sb.from("leads").update({ status }).eq("id", id);

  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true });
}
