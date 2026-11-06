import { AdminTableSkeleton } from "@/components/skeletons/admin";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function Loading() {
  const { t } = await getServerTranslations();
  return <AdminTableSkeleton label={t.common.loading} filters columns={5} />;
}
