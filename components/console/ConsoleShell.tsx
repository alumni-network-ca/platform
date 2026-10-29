import { Nav } from "@/components/Nav";

// The platform console's frame (design S1–S2): the shared nav bar, whose links and account menu replace the
// console's own header and side menu (docs/design/nav-bar.md), then the page.
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Nav />
      <div className="shellBody">
        <main className="shellMain">{children}</main>
      </div>
    </div>
  );
}
