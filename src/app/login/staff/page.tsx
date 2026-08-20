import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Staff and owner use the same phone + password login. */
export default function StaffLoginPage() {
  redirect("/login");
}
