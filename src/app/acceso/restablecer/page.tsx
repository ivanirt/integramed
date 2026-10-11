"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function RestablecerForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo actualizar la contraseña.");
        return;
      }
      setStatus(data.message || "Contraseña actualizada. Ya puedes entrar.");
    } catch {
      setError("No se pudo enviar la solicitud.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl">Nueva contraseña</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">
        Elige una contraseña de al menos 8 caracteres, con una letra y un número.
      </p>
      {!token ? (
        <p className="mt-8 text-sm text-red-800">
          Falta el enlace de restablecimiento. Solicita uno nuevo desde «¿Olvidaste tu contraseña?».
        </p>
      ) : status ? (
        <p className="mt-8 text-sm text-[#6D5E52]">{status}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            Nueva contraseña
            <input
              required
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Confirmar contraseña
            <input
              required
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
            />
          </label>
          {error ? <p className="text-sm text-red-800">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="border border-[#241B16] bg-[#241B16] px-4 py-2 text-sm text-[#FAF7F2] disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Guardar contraseña"}
          </button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link href={status ? "/acceso" : "/acceso/recuperar"} className="underline">
          {status ? "Entrar" : "Solicitar otro enlace"}
        </Link>
      </p>
    </div>
  );
}

export default function RestablecerPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-sm text-[#6D5E52]">Cargando…</div>}>
      <RestablecerForm />
    </Suspense>
  );
}
