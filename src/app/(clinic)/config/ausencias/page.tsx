import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require";

export default async function ConfigAusenciasRedirect() {
  await requireAdmin();
  redirect("/ausencias");
}
