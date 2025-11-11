export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(180deg, #0b261f 0%, #0d3b2e 100%)",
        color: "white",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <h1 style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
        Acceso clientes
      </h1>

      <form
        style={{
          backgroundColor: "white",
          color: "black",
          padding: "2rem",
          borderRadius: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "100%",
          maxWidth: "340px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        }}
      >
        <input
          type="email"
          placeholder="Correo electrónico"
          style={{
            padding: "0.8rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
          }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          style={{
            padding: "0.8rem",
            borderRadius: "0.5rem",
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          style={{
            backgroundColor: "#c8a34a",
            color: "#0b261f",
            fontWeight: "bold",
            padding: "0.8rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>

      <a
        href="/"
        style={{
          color: "#c8a34a",
          fontSize: "0.9rem",
          textDecoration: "underline",
        }}
      >
        ← Volver al inicio
      </a>
    </main>
  );
}

