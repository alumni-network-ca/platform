import { AdminFormSkeleton } from "@/components/skeletons/admin";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function Loading() {
  const { t } = await getServerTranslations();
  return <AdminFormSkeleton label={t.common.loading} fields={2} />;
}
