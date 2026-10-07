"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function AccesoForm() {
  const params = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "No se pudo entrar.");
      return;
    }
    if (data.user?.mustChangePassword) {
      window.location.href = "/cuenta/contrasena";
      return;
    }
    window.location.href = params.get("next") || "/";
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl">IntegraMed</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">
        Entra con el usuario o el correo del Practitioner y tu contraseña personal. Si aún no tienes una, usa el enlace
        de abajo.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Usuario o correo
          <input
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Contraseña
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
          />
        </label>
        {status ? <p className="text-sm text-red-800">{status}</p> : null}
        <button type="submit" className="border border-[#241B16] bg-[#241B16] px-4 py-2 text-sm text-[#FAF7F2]">
          Entrar
        </button>
        <p className="text-sm">
          <Link
            href={login.includes("@") ? `/acceso/recuperar?email=${encodeURIComponent(login.trim())}` : "/acceso/recuperar"}
            className="underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function AccesoPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-sm text-[#6D5E52]">Cargando…</div>}>
      <AccesoForm />
    </Suspense>
  );
}
