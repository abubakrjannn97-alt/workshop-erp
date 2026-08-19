import type { ReactNode } from "react";
import { BackButton } from "@/components/back-button";

export function PageHeader({
  title,
  description,
  actions,
  meta,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="page-header">
      <div className="page-header-text">
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions || meta || backHref ? (
        <div className="page-header-actions">
          {backHref && backLabel ? (
            <BackButton href={backHref} label={backLabel} className="ui-header-icon max-lg:hidden" />
          ) : null}
          {meta}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
