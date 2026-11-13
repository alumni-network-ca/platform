// The platform console's frame (design S1–S2) under the shared nav bar, whose links and account menu replace the
// console's own header and side menu (docs/design/nav-bar.md).
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  return (
    // Below the nav bar (66px), which the root layout renders.
    <div className="flex min-h-[calc(100vh-66px)] flex-col bg-background text-foreground">
      <div className="flex flex-1 flex-wrap">
        <main className="flex min-w-0 flex-[999_1_640px] flex-col gap-5 px-9 py-7 max-[700px]:px-4 max-[700px]:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
