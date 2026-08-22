"use client";

import { useEffect } from "react";

/** Keeps mobile chrome (--app-height, --vv-bottom-inset) aligned with the visible viewport. */
export function VisualViewportSync() {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const vv = window.visualViewport;
      const layoutH = window.innerHeight;
      const visibleH = vv?.height ?? layoutH;
      const offsetTop = vv?.offsetTop ?? 0;
      const bottomInset = Math.max(0, layoutH - offsetTop - visibleH);

      root.style.setProperty("--app-height", `${visibleH}px`);
      root.style.setProperty("--vv-bottom-inset", `${bottomInset}px`);
    };

    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      root.style.removeProperty("--app-height");
      root.style.removeProperty("--vv-bottom-inset");
    };
  }, []);

  return null;
}
