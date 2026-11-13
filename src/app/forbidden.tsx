"use client";
import Link from "next/link";
import { ShieldX } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { StatusPage } from "@/components/StatusPage";
import { Button } from "@/components/ui/button";

// forbidden(): a staff member whose role lacks the page's permission (ADR 0005). The status is a 403 when it is
// decided before a loading skeleton streams (app/admin/staff/layout.tsx).
export default function Forbidden() {
  const { t } = useLanguage();
  return (
    <StatusPage
      icon={ShieldX}
      eyebrow={t.errors.forbiddenEyebrow}
      title={t.admin.forbiddenTitle}
      actions={
        <Button asChild>
          <Link href="/admin">{t.admin.dashboard}</Link>
        </Button>
      }
    >
      <p>{t.admin.forbiddenBody}</p>
    </StatusPage>
  );
}
