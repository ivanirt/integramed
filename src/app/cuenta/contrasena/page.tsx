import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ChangePasswordForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage() {
  const user = await getSession();
  if (!user) redirect("/acceso");
  return <ChangePasswordForm forced={user.mustChangePassword} />;
}
