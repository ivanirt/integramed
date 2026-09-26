"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createPatientAction } from "@/lib/actions";
import { Button, Field, Input, Select } from "@/components/ui";

export default function NewPatientPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const id = await createPatientAction(new FormData(event.currentTarget));
      router.push(`/pacientes/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el Patient.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-serif text-4xl">Nuevo paciente</h1>
      <p className="mt-2 text-sm text-[#6D5E52]">Se escribe un recurso Patient. No hay otro almacén.</p>
      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4">
        <Field label="Nombre(s)">
          <Input name="given" required />
        </Field>
        <Field label="Apellido">
          <Input name="family" required />
        </Field>
        <Field label="Sexo">
          <Select name="gender" defaultValue="unknown">
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
            <option value="unknown">Desconocido</option>
          </Select>
        </Field>
        <Field label="Fecha de nacimiento">
          <Input type="date" name="birthDate" />
        </Field>
        {error ? <p className="text-sm text-red-800">{error}</p> : null}
        <Button type="submit">Guardar y abrir ficha</Button>
      </form>
    </div>
  );
}
