"use client";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
export default function Forbidden() {
  const { t } = useLanguage();
  return (
    <main className="page">
      <div className="panel">
        <h1>{t.admin.forbiddenTitle}</h1>
        <p>{t.admin.forbiddenBody}</p>
        <Link href="/admin">{t.admin.dashboard}</Link>
      </div>
    </main>
  );
}
