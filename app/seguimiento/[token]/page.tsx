import React from "react";

interface SeguimientoPageProps {
  params: { token: string };
}

export default function SeguimientoPage({ params }: SeguimientoPageProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "12px" }}>
        PRUEBA SEGUIMIENTO BKC
      </h1>
      <p style={{ fontSize: "14px", color: "#9ca3af" }}>
        Token recibido: <code>{params.token}</code>
      </p>
    </div>
  );
}
