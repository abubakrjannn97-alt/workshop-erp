import { redirect } from "next/navigation";

/** Roles live under Access (/settings/users). Keep route for old links. */
export default function RolesPage() {
  redirect("/settings/users#roles");
}
