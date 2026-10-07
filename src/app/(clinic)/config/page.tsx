import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/require";

export default async function ConfigIndex() {
  await requireAdmin();
  redirect("/config/horario");
}
