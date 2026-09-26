"use client";

import { useState } from "react";
import { saveStaffAction } from "@/lib/actions";
import { ROLE_LABELS, type RoleId } from "@/lib/roles";
import { Button, Field, Input } from "@/components/ui";

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as RoleId[];

export function StaffForm({
  initial,
}: {
  initial?: {
    id: string;
    given: string;
    family: string;
    prefix?: string;
    login: string;
    email: string;
    roles: RoleId[];
  };
}) {
  const [roles, setRoles] = useState<RoleId[]>(initial?.roles?.length ? initial.roles : ["doctor"]);
  const [status, setStatus] = useState<string | null>(null);

  return (
    <form
      className="grid max-w-xl gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("roles", roles.join(","));
        await saveStaffAction(data);
        setStatus(initial ? "Profesional actualizado." : "Profesional dado de alta.");
        if (!initial) e.currentTarget.reset();
      }}
    >
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <Field label="Nombre">
        <Input name="given" required defaultValue={initial?.given} />
      </Field>
      <Field label="Apellido">
        <Input name="family" required defaultValue={initial?.family} />
      </Field>
      <Field label="Prefijo">
        <Input name="prefix" defaultValue={initial?.prefix} />
      </Field>
      <Field label="Login">
        <Input name="login" required defaultValue={initial?.login} />
      </Field>
      <Field label="Correo">
        <Input name="email" type="email" defaultValue={initial?.email} />
      </Field>
      <div className="sm:col-span-2 text-sm">
        <p className="mb-2">Roles</p>
        <div className="flex flex-wrap gap-3">
          {ROLE_OPTIONS.map((role) => (
            <label key={role} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={roles.includes(role)}
                onChange={(e) =>
                  setRoles((prev) => (e.target.checked ? [...prev, role] : prev.filter((r) => r !== role)))
                }
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      </div>
      {status ? <p className="sm:col-span-2 text-sm">{status}</p> : null}
      <div className="sm:col-span-2">
        <Button type="submit">{initial ? "Guardar profesional" : "Dar de alta"}</Button>
      </div>
    </form>
  );
}
