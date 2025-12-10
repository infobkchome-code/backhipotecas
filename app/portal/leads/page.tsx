async function pasarAExpediente(id: string) {
  const r = await fetch("/api/valorador/convert-to-expediente", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const j = await r.json();
  if (j?.ok && j?.case_id) {
    window.location.href = `/portal/case/${j.case_id}`;
  }
}
