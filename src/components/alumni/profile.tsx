import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { panel, sectionTitle } from "./parts";

// A profile's parts, shared by your own (/me; design Me) and another alumnus's (/profile/…; design Profile).

/** A section of the profile: About, Career, Education, Open to. */
export const profileSection = cn(panel, "flex flex-col gap-4 px-7 py-6 max-[720px]:p-5");

/** A box in the side column: visibility, contact, your data. */
export const sideBox = cn(
  panel,
  "flex flex-col items-start gap-3 p-5.5 text-base text-subtle-foreground",
);
export const sideBoxTitle = "text-md font-bold text-foreground";

/** The bio. */
export const bodyText = "text-md leading-relaxed text-subtle-foreground";

/** What shows in a section with nothing in it yet. */
export const emptyText = "text-base text-muted-foreground";

/** The name, with the name at school after it, then the current role and a line of class, place and languages. */
export function ProfileWho({
  name,
  schoolName,
  role,
  details,
  className,
}: {
  name: string;
  schoolName?: string | null;
  role?: string;
  details: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 text-md text-subtle-foreground", className)}>
      <h1 className="text-3xl font-extrabold text-foreground">
        {name}{" "}
        {schoolName && (
          <span className="text-lg font-medium text-muted-foreground">({schoolName})</span>
        )}
      </h1>
      {role && <span>{role}</span>}
      <span className="text-base text-muted-foreground">{details}</span>
    </div>
  );
}

/** A section's heading, with its edit link on /me. */
export function SectionHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className={sectionTitle}>{title}</h2>
      {children}
    </div>
  );
}

/** One role or school: what, then where and when. */
export function ProfileRow({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-bold text-foreground">{title}</span>
      {sub && <span className="text-base text-muted-foreground">{sub}</span>}
    </div>
  );
}
