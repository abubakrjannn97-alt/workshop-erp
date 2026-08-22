import { requireSession } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { WorkerProfileView } from "@/components/worker-profile-view";

export default async function ProfilePage() {
  const session = await requireSession();
  const { t, locale, n } = await getTranslator();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, phone: true },
  });

  return (
    <WorkerProfileView
      locale={locale}
      name={user.name}
      phone={user.phone ?? ""}
      roleLabel={n("role", session.user.roleCode, session.user.roleName)}
    />
  );
}
