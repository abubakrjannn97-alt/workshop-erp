import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  className?: string;
};

export function FormField({
  label,
  hint,
  error,
  required,
  id: explicitId,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const id = explicitId ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<ControlProps>, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required ? true : undefined,
        className: [error ? "ui-input-error" : "", (children as ReactElement<ControlProps>).props.className]
          .filter(Boolean)
          .join(" "),
      })
    : children;

  return (
    <div className={`min-w-0 ${className ?? ""}`}>
      <label htmlFor={id} className={`ui-label ${required ? "ui-label-required" : ""}`}>
        {label}
      </label>
      {control}
      {hint ? (
        <span id={hintId} className="ui-hint mt-1 block leading-snug">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="ui-error mt-1 block leading-snug" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
