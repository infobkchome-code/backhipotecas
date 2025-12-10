import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");
  return createClient(url, key, { auth: { persistSession: false } });
}

function ilike(q: string) {
  const safe = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
  return `%${safe}%`;
}

export async function GET(req: Request) {
  const sb = supabaseAdmin();
  const { searchParams } = new URL(req.url);

  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  const status = (searchParams.get("status") || "").trim(); // new/contacted/discarded/converted
  const q = (searchParams.get("q") || "").trim();
  const urgent = searchParams.get("urgent") === "1";
  const overdue = searchParams.get("overdue") === "1";
  const incomplete = searchParams.get("incomplete") === "1";
  const sort = (searchParams.get("sort") || "latest").trim(); // latest | lessdata | priority

  let query = sb
    .from("leads_valorador")
    .select(
      "id,created_at,source,status,urgent,priority,due_date,processed_at,processed_note,crm_lead_id,name,phone,email,address,city,type,size_m2,bedrooms,bathrooms,has_garage,has_terrace,condition,result_min,result_max,lat,lon,utm,property,contact,result,ip,user_agent",
      { count: "exact" }
    );

  if (status) query = query.eq("status", status);
  if (urgent) query = query.eq("urgent", true);
  if (overdue) query = query.lt("due_date", new Date().toISOString().slice(0, 10));

  if (q) {
    const like = ilike(q);
    query = query.or(
      [
        `name.ilike.${like}`,
        `phone.ilike.${like}`,
        `email.ilike.${like}`,
        `city.ilike.${like}`,
        `address.ilike.${like}`,
      ].join(",")
    );
  }

  // Orden
  if (sort === "priority") {
    // prioridad: critica > alta > media > baja
    // si lo guardas como texto, ordenamos manualmente en client; aquí lo dejamos por fecha
    query = query.order("created_at", { ascending: false });
  } else if (sort === "lessdata") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Resumen (cards)
  const headCount = async (filters: any[] = []) => {
    let q = sb.from("leads_valorador").select("id", { count: "exact", head: true });
    for (const f of filters) q = f(q);
    const r = await q;
    return r.count || 0;
  };

  const today = new Date().toISOString().slice(0, 10);

  const summary = {
    new: await headCount([(x: any) => x.eq("status", "new")]),
    contacted: await headCount([(x: any) => x.eq("status", "contacted")]),
    converted: await headCount([(x: any) => x.eq("status", "converted")]),
    discarded: await headCount([(x: any) => x.eq("status", "discarded")]),
    urgent: await headCount([(x: any) => x.eq("urgent", true)]),
    overdue: await headCount([(x: any) => x.lt("due_date", today)]),
  };

  // “incomplete” lo calculamos en client (porque depende de JSON/columnas),
  // así evitamos SQL complejo. (el UI te lo enseña igual)

  return NextResponse.json({ ok: true, data: data ?? [], count: count ?? 0, summary });
}

export async function POST(req: Request) {
  const sb = supabaseAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const id = String(body?.id || "");
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const patch: any = {};
  if (body.status != null) patch.status = String(body.status);
  if (body.urgent != null) patch.urgent = Boolean(body.urgent);
  if (body.priority != null) patch.priority = String(body.priority);
  if (body.due_date != null) patch.due_date = body.due_date ? String(body.due_date) : null;
  if (body.note != null) patch.processed_note = body.note ? String(body.note) : null;

  if (patch.status && patch.status !== "new") patch.processed_at = new Date().toISOString();

  const { error } = await sb.from("leads_valorador").update(patch).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
