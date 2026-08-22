import { requirePermission } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import { fetchWorkerProducts } from "@core/worker/worker-data";
import { WorkerProductionView } from "@/components/worker-production-view";

export default async function WorkerProductionPage() {
  await requirePermission("production.view");
  const { t, locale } = await getTranslator();
  const products = await fetchWorkerProducts();

  return <WorkerProductionView title={t("nav.production")} products={products} locale={locale} />;
}
