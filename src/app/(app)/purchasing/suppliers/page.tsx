import Link from "next/link";
import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { createSupplier } from "@/app/actions/suppliers";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "../purchasing.module.css";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; added?: string }>;
}) {
  const { t } = await getTranslator();
  const session = await requirePermission("suppliers.view");
  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "suppliers.manage");
  const { error, added } = await searchParams;

  const [suppliers, materials] = await Promise.all([
    prisma.supplier.findMany({
      where: { archivedAt: null },
      include: { _count: { select: { orders: true, materials: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  async function save(formData: FormData) {
    "use server";
    const result = await createSupplier(formData);
    if (result?.error) {
      redirect(`/purchasing/suppliers?error=${encodeURIComponent(result.error)}`);
    }
    redirect("/purchasing/suppliers?added=1");
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t("po.suppliers")} backHref="/purchasing" backLabel={t("common.back")} />

      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}
      {added ? (
        <p className="m-0 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          {t("po.supplierAdded")}
        </p>
      ) : null}

      {canManage ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("po.addSupplier")}</h2>
          </div>
          <div className="p-4">
            <form action={save} className="grid max-w-lg gap-3">
              <FormField label={t("common.name")} required>
                <input name="name" required className="ui-input" placeholder={t("po.supplierNamePh")} />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("common.phone")}>
                  <input name="phone" className="ui-input" inputMode="tel" />
                </FormField>
                <FormField label={t("po.contactPerson")}>
                  <input name="contact" className="ui-input" />
                </FormField>
              </div>
              {materials.length > 0 ? (
                <FormField label={t("po.supplierMaterials")}>
                  <select name="materialId" multiple className="ui-input min-h-[88px] py-2">
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : null}
              <PendingButton className="ui-btn-primary min-h-[44px] w-full sm:w-auto" pendingLabel={t("common.saving")}>
                {t("common.save")}
              </PendingButton>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("po.suppliersList")}</h2>
        </div>
        {suppliers.length === 0 ? (
          <div className={styles.empty}>{t("po.noSuppliers")}</div>
        ) : (
          <ul className={styles.list}>
            {suppliers.map((s) => (
              <li key={s.id}>
                <Link href={`/purchasing/suppliers/${s.id}`} className={styles.row}>
                  <div className={styles.rowMain}>
                    <p className={styles.rowTitle}>{s.name}</p>
                    <p className={styles.rowMeta}>
                      {s.phone ?? t("common.noPhone")}
                      {s._count.materials > 0 ? ` · ${s._count.materials} ${t("common.material")}` : ""}
                      {s._count.orders > 0 ? ` · ${s._count.orders} ${t("po.ordersShort")}` : ""}
                    </p>
                  </div>
                  <ChevronRight size={16} strokeWidth={ICON_STROKE} className={styles.chevron} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
