"use client";

import { useRouter } from "next/navigation";
import { startConsultFromAppointment } from "@/lib/actions";

export function StartConsultButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="underline"
      onClick={async () => {
        const { encounterId, patientId } = await startConsultFromAppointment(appointmentId);
        router.push(`/consulta/${encounterId}?paciente=${patientId}`);
      }}
    >
      Abrir consulta
    </button>
  );
}
