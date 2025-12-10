import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const q = (url.searchParams.get("q") || "").trim();
    const exported = (url.searchParams.get("exported") || "no").trim(); // "no" | "yes" | ""
    const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 500);
    const offset = Math.max(Number(url.searchParams.get("offset") || "0"), 0);

    let query = supabaseAdmin
      .from("leads_valorador")
      .select("*")
      .order("created_at", { ascending: false });

    if (exported === "no") query = query.is("exported_at", null);
    if (exported === "yes") query = query.not("exported_at", "is", null);

    if (q) {
      // Busca por varias columnas típicas
      const like = `%${q}%`;
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

    const { data, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
