export function AppShellMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell-main relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent px-4 py-2 max-lg:pb-[calc(var(--mobile-chrome-bottom)+8px)] lg:px-6 lg:py-5 lg:pb-6">
      {children}
    </main>
  );
}
