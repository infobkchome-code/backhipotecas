import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();
  const exported = searchParams.get("exported"); // "yes" | "no" | null
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);

  let query = supabaseAdmin
    .from("leads_valorador")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    const s = q.replace(/[%_]/g, "\\$&");
    query = query.or(
      `name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,city.ilike.%${s}%,address.ilike.%${s}%`
    );
  }

  if (exported === "yes") query = query.not("exported_at", "is", null);
  if (exported === "no") query = query.is("exported_at", null);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [], count: count ?? 0 });
}
