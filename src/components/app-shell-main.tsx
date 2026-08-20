export function AppShellMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell-main relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent px-2 py-1 max-lg:pb-[calc(var(--mobile-chrome-bottom)+6px)] lg:px-20 lg:py-4 lg:pb-5 xl:px-32">
      {children}
    </main>
  );
}
