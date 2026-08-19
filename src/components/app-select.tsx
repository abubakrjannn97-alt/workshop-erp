"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./app-select.module.css";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function AppSelect({
  name,
  value,
  defaultValue = "",
  onChange,
  options,
  placeholder,
  required,
  disabled,
  className,
  error,
  "aria-label": ariaLabel,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  "aria-label"?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const selected = controlled ? value : internal;
  const [open, setOpen] = useState(false);

  const active = options.find((option) => option.value === selected && option.value !== "");
  const label = active?.label ?? placeholder ?? "";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(next: string) {
    if (!controlled) setInternal(next);
    onChange?.(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`${styles.wrap} ${className ?? ""}`.trim()}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selected}
          required={required && !selected}
          className={styles.hiddenInput}
          tabIndex={-1}
          aria-hidden
        />
      ) : null}
      <button
        type="button"
        className={`${styles.trigger} ${error ? styles.triggerError : ""}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={active ? undefined : styles.triggerPlaceholder}>{label}</span>
        <ChevronDown size={16} strokeWidth={ICON_STROKE} className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`.trim()} aria-hidden />
      </button>
      {open ? (
        <ul id={listId} className={styles.menu} role="listbox">
          {options.map((option) => (
            <li key={option.value || "__empty"} role="option" aria-selected={option.value === selected}>
              <button
                type="button"
                disabled={option.disabled}
                className={option.value === selected ? styles.optionActive : styles.option}
                onClick={() => pick(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
