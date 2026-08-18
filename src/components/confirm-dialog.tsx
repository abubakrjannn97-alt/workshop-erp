"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const actions: ReactNode = (
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <button type="button" className="ui-btn-secondary" onClick={onCancel}>
        {cancelLabel}
      </button>
      <button
        ref={confirmRef}
        type="button"
        className={destructive ? "ui-btn-danger" : "ui-btn-primary"}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  );

  return createPortal(
    <>
      <button type="button" className="ui-dialog-backdrop" aria-label={cancelLabel} onClick={onCancel} />
      <div
        className="ui-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <h2 id={titleId} className="text-h2 text-[var(--color-text-primary)]">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="mt-2 text-body text-[var(--color-text-muted)]">
            {description}
          </p>
        ) : null}
        {actions}
      </div>
    </>,
    document.body,
  );
}
