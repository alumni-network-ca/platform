import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import type { Search } from "@/lib/admin/data";
import { getServerTranslations } from "@/lib/i18n-server";
import { toSchoolTime } from "@/lib/posts/posts";
import { ui } from "@/components/admin/parts";
import { KindTag } from "@/components/posts/PostCards";
import { PostForm } from "../PostForm";

// A7.2 / A7.3 for a new post: the kind is chosen on the list (A7.1) and fixed from here on.
export default async function NewPost({ searchParams }: { searchParams: Search }) {
  const { school } = await requireStaff("/admin/posts", "posts.manage");
  const [{ t: all }, p] = await Promise.all([getServerTranslations(), searchParams]);
  const t = all.posts;
  const kind = p.kind === "news" || p.kind === "fundraising" ? p.kind : null;
  if (!kind) redirect("/admin/posts");
  // A schedule suggestion: tomorrow at 9:00, school time.
  const now = new Date();
  const tomorrow = toSchoolTime(new Date(now.getTime() + 24 * 3600 * 1000)).slice(0, 10) + "T09:00";
  return (
    <>
      <Link href="/admin/posts" className={ui.backLink}>
        ← {t.allPosts}
      </Link>
      <div className={ui.shellTitle}>
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <KindTag kind={kind} label={kind === "news" ? t.news : t.fundraising} />
            <h1>{kind === "news" ? t.newNews : t.newFundraising}</h1>
          </div>
          {kind === "fundraising" && <p>{t.fundraisingIntro}</p>}
        </div>
      </div>
      <PostForm
        schoolId={school.id}
        t={t}
        values={{
          id: null,
          kind,
          title: "",
          body: null,
          summary: "",
          externalUrl: "",
          goalNote: "",
          endsOn: "",
          coverPath: null,
          coverUrl: null,
          state: "draft",
          publishAt: tomorrow,
          publishLabel: null,
          notifiedLabel: null,
        }}
      />
    </>
  );
}
