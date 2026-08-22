"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { currentNavPath, trackNavPath } from "@core/shared/nav-history";

export function NavHistoryTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    trackNavPath(currentNavPath(pathname, search));
  }, [pathname, search]);

  return null;
}
