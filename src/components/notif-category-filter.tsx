"use client";

import { useRouter } from "next/navigation";
import { AppSelect } from "@/components/app-select";

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
    <div className="max-w-xs" data-tour="notif-cats">
      <AppSelect
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
