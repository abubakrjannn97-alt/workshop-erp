"use client";

import { useState } from "react";
import { AppSelect } from "@/components/app-select";

export function OrdersStatusFilter({
  name,
  defaultValue,
  allLabel,
  statuses,
}: {
  name: string;
  defaultValue?: string;
  allLabel: string;
  statuses: { code: string; name: string }[];
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <AppSelect
      name={name}
      value={value}
      onChange={setValue}
      options={[
        { value: "", label: allLabel },
        ...statuses.map((s) => ({ value: s.code, label: s.name })),
      ]}
    />
  );
}
