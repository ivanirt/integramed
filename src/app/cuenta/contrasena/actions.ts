"use server";

import { headers } from "next/headers";
import { credentialLinkedToPractitioner, findCredentialAccount } from "@/lib/account-lookup.js";
import { mutateAccounts, readAccounts } from "@/lib/credentials";
import {
  CHANGE_PASSWORD_RATE_ERROR,
  allowPasswordChangeAttempt,
  commitPasswordChange,
  evaluatePasswordChange,
  passwordChangeClientAddress,
} from "@/lib/password-change";
import { createSession, getSession } from "@/lib/session";

export type ChangePasswordState = { ok: true } | { ok: false; error: string } | null;

async function requestIp(): Promise<string> {
  const headerStore = await headers();
  return passwordChangeClientAddress((name) => headerStore.get(name));
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getSession();
  if (!user) return { ok: false, error: "La sesión no es válida. Vuelve a entrar." };

  if (!allowPasswordChangeAttempt(user.id, await requestIp())) {
    return { ok: false, error: CHANGE_PASSWORD_RATE_ERROR };
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const nextPassword = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const account = findCredentialAccount(readAccounts(), { id: user.id, login: user.login });
  if (account && !credentialLinkedToPractitioner(account, user.id)) {
    return { ok: false, error: "La sesión no es válida. Vuelve a entrar." };
  }
  const decision = await evaluatePasswordChange({
    account,
    currentPassword,
    nextPassword,
    confirm,
  });
  if (!decision.ok) return { ok: false, error: decision.error };

  const changedAt = Date.now();
  const expectedChangedAt = account?.passwordChangedAt ?? 0;
  let applied = false;
  mutateAccounts((accounts) => {
    applied = commitPasswordChange(accounts, user.id, decision.passwordHash, changedAt, expectedChangedAt);
  });
  if (!applied) return { ok: false, error: "No se pudo guardar la contraseña. Inténtalo de nuevo." };

  await createSession(
    { id: user.id, name: user.name, login: user.login, role: user.role },
    { pwdAt: changedAt, mustChange: false },
  );
  return { ok: true };
}
