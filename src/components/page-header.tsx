import { Suspense, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { ICON_STROKE } from "@/components/nav-icons";

export function PageHeader({
  title,
  description,
  actions,
  meta,
  backHref,
  backLabel,
}: {
  title: string;
  description?: ReactNode;
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
            <Suspense
              fallback={
                <button type="button" className="ui-header-icon max-lg:hidden" aria-hidden tabIndex={-1}>
                  <ChevronLeft size={22} strokeWidth={ICON_STROKE} aria-hidden />
                </button>
              }
            >
              <BackButton href={backHref} label={backLabel} className="ui-header-icon max-lg:hidden" />
            </Suspense>
          ) : null}
          {meta}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
