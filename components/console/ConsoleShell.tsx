// The platform console's frame (design S1–S2) under the shared nav bar, whose links and account menu replace the
// console's own header and side menu (docs/design/nav-bar.md).
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <div className="shellBody">
        <main className="shellMain">{children}</main>
      </div>
    </div>
  );
}
