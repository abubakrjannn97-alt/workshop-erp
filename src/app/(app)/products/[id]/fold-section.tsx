"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./fold-section.module.css";

export function FoldSection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.fold}>
      <button
        type="button"
        className={styles.head}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{title}</span>
        <ChevronDown
          size={18}
          strokeWidth={ICON_STROKE}
          className={open ? styles.chevronOpen : styles.chevron}
          aria-hidden
        />
      </button>
      {open ? <div className={styles.body}>{children}</div> : null}
    </div>
  );
}
