export function AppShellMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell-main relative z-10 mx-auto min-w-0 w-full max-w-[480px] flex-1 overflow-y-auto overflow-x-hidden bg-transparent px-4 py-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      {children}
    </main>
  );
}
