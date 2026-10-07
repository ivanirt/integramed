"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { changePasswordAction, type ChangePasswordState } from "./actions";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, formAction, pending] = useActionState(changePasswordAction, null as ChangePasswordState);

  useEffect(() => {
    if (state?.ok) window.location.assign("/");
  }, [state]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/acceso");
  }

  const error = state && !state.ok ? state.error : "";

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-serif text-4xl">Cambia tu contraseña</h1>
      <p id="password-hint" className="mt-2 text-sm text-[#6D5E52]">
        {forced
          ? "Esta contraseña es temporal. Elige una nueva antes de usar la clínica. Tiene que tener al menos 12 caracteres, con una letra y un número, y ser distinta de la actual."
          : "Elige una contraseña de al menos 12 caracteres, con una letra y un número, distinta de la actual."}
      </p>
      <form action={formAction} className="mt-8 space-y-4" aria-describedby="password-hint">
        <label className="block text-sm" htmlFor="currentPassword">
          Contraseña actual
          <input
            id="currentPassword"
            name="currentPassword"
            required
            type="password"
            autoComplete="current-password"
            aria-invalid={error ? true : undefined}
            className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm" htmlFor="password">
          Nueva contraseña
          <input
            id="password"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "password-hint password-error" : "password-hint"}
            className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
          />
        </label>
        <label className="block text-sm" htmlFor="confirm">
          Confirmar contraseña
          <input
            id="confirm"
            name="confirm"
            required
            type="password"
            autoComplete="new-password"
            aria-invalid={error ? true : undefined}
            className="mt-1 w-full border border-[#EADBCE] bg-white px-3 py-2"
          />
        </label>
        {error ? (
          <p id="password-error" role="alert" className="text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="border border-[#241B16] bg-[#241B16] px-4 py-2 text-sm text-[#FAF7F2] disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
      <div className="mt-6 flex gap-4 text-sm">
        {forced ? null : (
          <Link href="/perfil" className="underline">
            Volver al perfil
          </Link>
        )}
        <button type="button" onClick={logout} className="underline">
          Salir
        </button>
      </div>
    </div>
  );
}
