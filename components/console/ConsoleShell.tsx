import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";
import { ConsoleNav } from "./ConsoleNav";

// The platform console's frame (design S1–S2): header, menu, page. English only: its users are the platform admins.
export function ConsoleShell({
  email,
  activeGrants,
  children,
}: {
  email: string;
  activeGrants: number;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <header className="shellHeader">
        <Link className="shellBrand" href="/console">
          <span className="shellBrandMark" aria-hidden="true">
            AN
          </span>
          <span className="shellBrandText">
            <span className="shellBrandName">Alumni Network</span>
            <span className="shellBrandSub">Platform console</span>
          </span>
        </Link>
        <div className="shellUser">
          <span>{email}</span>
          <span className="shellRole">Platform admin</span>
          <SignOutButton to="/login" />
        </div>
      </header>
      <div className="shellBody">
        <ConsoleNav activeGrants={activeGrants} />
        <main className="shellMain">{children}</main>
      </div>
    </div>
  );
}
