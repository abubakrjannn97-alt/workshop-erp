import { redirect } from "next/navigation";
import { requireSession } from "@core/auth/authz";
import { hasWorkerShell } from "@core/worker/worker-shell";

/** «Ещё» живёт в hamburger-меню; старый URL ведём на главную. */
export default async function MorePage() {
  const session = await requireSession();
  if (hasWorkerShell(session.user.roleCode, session.user.permissions)) redirect("/me");
  redirect("/");
}
