/** Bottom-tab / home roots — never show back (hamburger stays). */
const ALWAYS_ROOT = new Set(["/", "/more"]);

/**
 * Section list pages: one level below a section root.
 * Always have a clear parent even when also registered as nav leaves.
 */
const SECTION_LIST_PARENTS: Record<string, string> = {
  "/production/batches": "/production",
  "/production/scrap": "/production",
  "/warehouse/inventory": "/warehouse",
  "/warehouse/finished": "/warehouse",
  "/warehouse/movements": "/warehouse",
  "/warehouse/print": "/warehouse",
  "/warehouse/add": "/warehouse",
  "/finance/expenses": "/finance",
  "/crm/history": "/crm",
  "/me/profile": "/me",
  "/me/commission": "/me",
  "/me/history": "/me",
  "/products/new": "/products",
  "/materials/new": "/materials",
  "/orders/new": "/orders",
  "/orders/quick": "/orders",
  "/purchasing/suppliers": "/purchasing",
  "/settings/users": "/settings",
  "/settings/roles": "/settings",
  "/settings/units": "/settings",
  "/settings/backups": "/settings",
  "/settings/approvals": "/settings",
  "/settings/audit": "/settings",
};

/** Top-level pages usually opened from «Ещё» — on mobile, back goes to /more. */
const MORE_LANDING = new Set([
  "/sales",
  "/crm",
  "/products",
  "/materials",
  "/purchasing",
  "/finance",
  "/employees",
  "/analytics",
  "/settings",
  "/help",
  "/notifications",
  "/search",
]);

export type BackNavOptions = {
  /** Current role bottom-tab hrefs — these stay roots (no back). */
  tabRoots?: ReadonlySet<string>;
};

function normalizePath(pathname: string) {
  const path = pathname.split("?")[0]?.split("#")[0] ?? "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

export function resolveBackHref(pathname: string, opts?: BackNavOptions): string | null {
  const path = normalizePath(pathname);
  const tabs = opts?.tabRoots;

  if (ALWAYS_ROOT.has(path)) return null;
  if (tabs?.has(path)) return null;

  const listed = SECTION_LIST_PARENTS[path];
  if (listed) {
    // If the listed parent is itself a tab root missing from this role, still go there.
    return listed;
  }

  if (MORE_LANDING.has(path)) {
    // Mobile (tabs known): return to «Ещё». Desktop (no tabs): no shell back.
    return tabs ? "/more" : null;
  }

  if (path.startsWith("/settings/")) return "/settings";
  if (path.startsWith("/more/")) return "/more";
  if (path.startsWith("/crm/customers/")) return "/crm";
  if (path.startsWith("/purchasing/suppliers/")) return "/purchasing";

  const segments = path.split("/").filter(Boolean);
  if (segments.length <= 1) {
    // Unknown single-segment page opened from more on mobile.
    return tabs ? "/more" : null;
  }

  return `/${segments.slice(0, -1).join("/")}`;
}
