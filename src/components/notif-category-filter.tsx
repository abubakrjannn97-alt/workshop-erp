"use client";

import { useRouter } from "next/navigation";
import { AppSelect } from "@/components/app-select";
import styles from "./notif-category-filter.module.css";

type Option = { value: string; label: string };

export function NotifCategoryFilter({
  active,
  options,
  ariaLabel,
}: {
  active: string;
  options: Option[];
  ariaLabel: string;
}) {
  const router = useRouter();

  return (
    <div className={styles.wrap} data-tour="notif-cats">
      <AppSelect
        className={styles.select}
        value={active}
        aria-label={ariaLabel}
        options={options}
        onChange={(value) => {
          router.push(value === "all" ? "/notifications" : `/notifications?cat=${value}`);
        }}
      />
    </div>
  );
}
