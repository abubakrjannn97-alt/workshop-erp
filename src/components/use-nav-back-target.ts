"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { isShellRoot } from "@core/shared/back-nav";
import { currentNavPath, resolveHistoryBack } from "@core/shared/nav-history";

/** Previous in-app page (with query), or logical parent fallback. */
export function useNavBackTarget(
  fallbackHref: string | null,
  opts?: { tabRoots?: ReadonlySet<string> },
): string | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (isShellRoot(pathname, opts?.tabRoots)) return null;

  const fullPath = currentNavPath(pathname, searchParams.toString());
  return resolveHistoryBack(fullPath, fallbackHref);
}
