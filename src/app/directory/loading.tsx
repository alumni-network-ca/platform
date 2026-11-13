import { DirectorySkeleton } from "@/components/skeletons/alumni";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function Loading() {
  const { t } = await getServerTranslations();
  return <DirectorySkeleton label={t.common.loading} />;
}
