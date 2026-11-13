import { FormPageSkeleton } from "@/components/skeletons/alumni";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function Loading() {
  const { t } = await getServerTranslations();
  return <FormPageSkeleton label={t.common.loading} />;
}
