export function AppShellMain({
  children,
  nestedChrome = false,
}: {
  children: React.ReactNode;
  nestedChrome?: boolean;
}) {
  const mobileTop = nestedChrome
    ? "max-lg:pt-[var(--page-pad-y)]"
    : "max-lg:pt-[calc(var(--safe-top)+var(--page-pad-y))]";

  return (
    <main
      className={`app-shell-main relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent max-lg:px-[var(--page-pad-x)] ${mobileTop} max-lg:pb-[calc(var(--mobile-chrome-bottom)+var(--page-pad-y))] lg:px-20 lg:py-4 lg:pb-5 xl:px-32`}
    >
      {children}
    </main>
  );
}
