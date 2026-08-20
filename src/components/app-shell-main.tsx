export function AppShellMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell-main relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent px-3 py-1 max-lg:pb-[calc(var(--mobile-chrome-bottom)+8px)] lg:px-4 lg:py-3 lg:pb-4">
      {children}
    </main>
  );
}
