import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

const SKIP_INPUT_TYPES = new Set(["checkbox", "radio", "file", "hidden", "submit", "button", "reset"]);

type ControlProps = {
  id?: string;
  type?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
  className?: string;
};

function controlClassName(child: ReactElement<ControlProps>, error?: string): string | undefined {
  const existing = child.props.className ?? "";
  const tag = typeof child.type === "string" ? child.type : "";
  const inputType = tag === "input" ? (child.props.type ?? "text") : "";
  const skipNative = tag === "input" && SKIP_INPUT_TYPES.has(inputType);
  const needsFieldClass =
    !skipNative && (tag === "input" || tag === "select" || tag === "textarea") && !existing.includes("ui-input");
  const merged = [needsFieldClass ? "ui-input" : "", error ? "ui-input-error" : "", existing]
    .filter(Boolean)
    .join(" ");
  return merged || undefined;
}

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
        className: controlClassName(children as ReactElement<ControlProps>, error),
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
