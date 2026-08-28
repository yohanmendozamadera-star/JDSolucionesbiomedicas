"use client";
import { useState } from "react";

export default function ActivatePage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  return <main className="auth-page"><section className="auth-card">
    <img src="/brand/jd-soluciones-logo.png" alt="JD Soluciones Biomédicas" />
    <span>ACTIVACIÓN SEGURA</span><h1>Crea tu contraseña</h1>
    <p>Debe tener mínimo 10 caracteres. Te recomendamos incluir mayúsculas, números y un símbolo.</p>
    <form noValidate onSubmit={async e => {
      e.preventDefault(); if (loading) return; setError("");
      const form = new FormData(e.currentTarget);
      const password = String(form.get("password") ?? "");
      const confirm = String(form.get("confirm") ?? "");
      if (password.length < 10) { setError("La contraseña debe tener al menos 10 caracteres."); return; }
      if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
      const token = new URLSearchParams(location.search).get("token");
      if (!token) { setError("Falta el código de activación. Abre nuevamente el enlace completo."); return; }
      setLoading(true);
      try {
        const response = await fetch("/api/auth/activate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, password }) });
        const raw = await response.text();
        let data: { error?: string } = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
        if (!response.ok) { setError(data.error ?? "No se pudo activar la cuenta."); setLoading(false); return; }
        location.href = "/portal";
      } catch { setError("La conexión se interrumpió. Recarga la página e inténtalo nuevamente."); setLoading(false); }
    }}>
      <label>Nueva contraseña<input name="password" type="password" required autoComplete="new-password" placeholder="Mínimo 10 caracteres" /></label>
      <label>Confirmar contraseña<input name="confirm" type="password" required autoComplete="new-password" placeholder="Escríbela nuevamente" /></label>
      {error && <em role="alert">⚠ {error}</em>}
      <button type="submit" disabled={loading}>{loading ? "Guardando contraseña…" : "Guardar contraseña y entrar"}</button>
    </form>
  </section></main>;
}
