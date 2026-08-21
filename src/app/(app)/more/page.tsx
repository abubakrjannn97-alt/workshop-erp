import { redirect } from "next/navigation";
import { requireSession } from "@core/auth/authz";

/** «Ещё» живёт в hamburger-меню; старый URL ведём на главную. */
export default async function MorePage() {
  const session = await requireSession();
  if (session.user.roleCode === "worker") redirect("/me");
  redirect("/");
}
