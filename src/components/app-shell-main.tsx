export function AppShellMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell-main relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bg-[var(--color-background)] lg:px-6 lg:py-5 lg:pb-6">
      {children}
    </main>
  );
}
