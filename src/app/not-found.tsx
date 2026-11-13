import Link from "next/link";
import { SearchX } from "lucide-react";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui/button";
import { getServerTranslations } from "@/lib/i18n-server";

// Any notFound() and any address that matches no page (FND-14). A hidden or foreign profile ends here too, worded
// like a page that does not exist, so it says nothing about who is a member.
export default async function NotFound() {
  const { t } = await getServerTranslations();
  return (
    <StatusPage
      icon={SearchX}
      eyebrow={t.errors.notFoundEyebrow}
      title={t.errors.notFoundTitle}
      actions={
        <Button asChild>
          <Link href="/">{t.errors.goHome}</Link>
        </Button>
      }
    >
      <p>{t.errors.notFoundBody}</p>
    </StatusPage>
  );
}
