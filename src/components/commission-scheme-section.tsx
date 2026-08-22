"use client";

import { ChevronDown } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "@/app/(app)/employees/employees.module.css";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function CommissionSchemeSection({ title, children }: Props) {
  return (
    <details className={styles.collapsibleSection}>
      <summary className={styles.collapsibleHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <ChevronDown size={18} strokeWidth={ICON_STROKE} className={styles.collapsibleChevron} aria-hidden />
      </summary>
      <div className={styles.collapsibleBody}>{children}</div>
    </details>
  );
}
