import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * What happened and what to do next, for the 404, 403 and error pages (FND-14). Full height under the nav bar, or
 * `inShell` inside the admin shell's own <main>, beside its menu.
 */
export function StatusPage({
  icon: Icon,
  eyebrow,
  title,
  children,
  actions,
  inShell = false,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  inShell?: boolean;
}) {
  const Root = inShell ? "section" : "main";
  return (
    <Root
      className={cn(
        "mx-auto flex w-full max-w-xl flex-col items-center gap-3 px-6 py-16 text-center",
        !inShell && "min-h-[calc(100vh-66px)] justify-center",
      )}
    >
      <span
        aria-hidden="true"
        className="mb-3 grid size-14 place-items-center rounded-full bg-primary-soft text-primary"
      >
        <Icon className="size-7" strokeWidth={2} />
      </span>
      <p className="m-0 text-sm font-semibold text-primary">{eyebrow}</p>
      <h1 className="m-0 text-3xl font-extrabold text-balance text-foreground">{title}</h1>
      {children && (
        <div className="m-0 text-md text-pretty text-muted-foreground [&_p]:m-0">{children}</div>
      )}
      {actions && <div className="mt-5 flex flex-wrap justify-center gap-3">{actions}</div>}
    </Root>
  );
}
