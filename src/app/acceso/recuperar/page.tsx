"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function RecuperarForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo enviar la solicitud.");
        return;
      }
      setStatus(data.message || "Si la cuenta existe, enviamos un enlace para restablecer la contraseña.");
    } catch {
      setError("No se pudo enviar la solicitud.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl">¿Olvidaste tu contraseña?</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">
        Escribe tu correo. Si la cuenta existe, te enviaremos un enlace para elegir una nueva contraseña. El enlace
        dura 45 minutos y solo puede usarse una vez.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Correo electrónico
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
          />
        </label>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        {status ? <p className="text-sm text-[#6D5E52]">{status}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="border border-[#241B16] bg-[#241B16] px-4 py-2 text-sm text-[#FAF7F2] disabled:opacity-50"
        >
          {pending ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
      <p className="mt-6 text-sm">
        <Link href="/acceso" className="underline">
          Volver a entrar
        </Link>
      </p>
    </div>
  );
}

export default function RecuperarPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-sm text-[#6D5E52]">Cargando…</div>}>
      <RecuperarForm />
    </Suspense>
  );
}
