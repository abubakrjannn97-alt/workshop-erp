"use client";

import type { ReactNode } from "react";
import styles from "./login-page.module.css";

/** Centers the login card; on mobile input focus, gently lifts it above the keyboard. */
export function LoginScreen({ children }: { children: ReactNode }) {
  return (
    <div
      className={styles.screen}
      onFocusCapture={(e) => {
        const el = e.target;
        if (!(el instanceof HTMLElement)) return;
        if (!el.matches("input, textarea, select")) return;
        window.setTimeout(() => {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }, 120);
      }}
    >
      {children}
    </div>
  );
}
