const ROOT_PATHS = new Set([
  "/",
  "/orders",
  "/production",
  "/warehouse",
  "/crm",
  "/sales",
  "/finance",
  "/purchasing",
  "/products",
  "/materials",
  "/employees",
  "/analytics",
  "/more",
  "/me",
  "/settings",
  "/help",
  "/search",
  "/notifications",
]);

/** Section list pages: one level below root, still not a detail view. */
const SECTION_LIST_PARENTS: Record<string, string> = {
  "/production/batches": "/production",
  "/production/scrap": "/production",
  "/warehouse/inventory": "/warehouse",
  "/warehouse/finished": "/warehouse",
  "/warehouse/movements": "/warehouse",
  "/warehouse/print": "/warehouse",
  "/finance/expenses": "/finance",
  "/crm/history": "/crm",
  "/me/profile": "/me",
  "/me/commission": "/me",
  "/me/history": "/me",
  "/products/new": "/products",
  "/orders/new": "/orders",
  "/purchasing/suppliers": "/purchasing",
};

function normalizePath(pathname: string) {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

export function resolveBackHref(pathname: string): string | null {
  const path = normalizePath(pathname);
  if (ROOT_PATHS.has(path)) return null;

  const listed = SECTION_LIST_PARENTS[path];
  if (listed) return listed;

  if (path.startsWith("/settings/")) return "/settings";
  if (path.startsWith("/more/")) return "/more";
  if (path.startsWith("/crm/customers/")) return "/crm";
  if (path.startsWith("/purchasing/suppliers/")) return "/purchasing";

  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) return null;

  return `/${segments.slice(0, -1).join("/")}`;
}
