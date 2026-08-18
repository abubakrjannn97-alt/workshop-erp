"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsLeft, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import { WorkshopMark } from "@/components/workshop-mark";
import { NAV_ICONS } from "@/components/nav-icons";
import { isNavItemActive, sidebarGroups } from "@core/shared/nav";
import styles from "./sidebar.module.css";

const STORAGE_KEY = "workshop_sidebar_collapsed";
const COLLAPSE_EVENT = "workshop:sidebar-collapse";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new CustomEvent(COLLAPSE_EVENT, { detail: next }));
  } catch {
    /* ignore */
  }
}

const linkFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-0";

export function Sidebar({
  companyName,
  permissions,
  roleCode,
  locale,
}: {
  companyName: string;
  userName?: string;
  permissions: string[];
  roleCode: string;
  unread?: number;
  locale: Locale;
}) {
  const path = usePathname();
  const router = useRouter();
  const t = createT(locale);
  const [collapsed, setCollapsed] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setCollapsed(readCollapsed());
    function onCollapse(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsed(typeof detail === "boolean" ? detail : readCollapsed());
    }
    window.addEventListener(COLLAPSE_EVENT, onCollapse);
    return () => window.removeEventListener(COLLAPSE_EVENT, onCollapse);
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsed(next);
  }

  const groups = sidebarGroups(permissions, roleCode);
  const activePath = pendingHref ?? path;

  useEffect(() => {
    setPendingHref(null);
  }, [path]);

  useEffect(() => {
    for (const group of sidebarGroups(permissions, roleCode)) {
      for (const item of group.items) {
        router.prefetch(item.href);
      }
    }
  }, [router, permissions, roleCode]);

  return (
    <aside
      className={`${styles.sidebar} z-30 hidden h-full shrink-0 flex-col transition-[width] duration-150 print:hidden lg:flex ${
        collapsed ? "w-12" : "w-[180px]"
      }`}
      aria-label={t("nav.menu")}
    >
      <div
        className={`${styles.brand} flex h-10 shrink-0 items-center ${collapsed ? "justify-center px-1" : "gap-2 px-3"}`}
      >
        <WorkshopMark size={collapsed ? 28 : 32} className="rounded-[22%]" />
        {!collapsed ? (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Produsion System
            </p>
            <p className="truncate text-xs font-semibold text-white">{companyName}</p>
          </div>
        ) : null}
      </div>

      <nav className={`${styles.nav} min-h-0 flex-1 overflow-y-auto px-1.5 py-1`}>
        {groups.map((group) => (
          <div key={group.id}>
            {group.labelKey && !collapsed ? (
              <p className={`${styles.groupLabel} px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.1em]`}>
                {t(group.labelKey)}
              </p>
            ) : collapsed ? (
              <div className="h-2" aria-hidden />
            ) : null}
            {group.items.map((item) => {
              const active = isNavItemActive(activePath, item.href);
              const Icon = NAV_ICONS[item.icon];
              const label = t(item.labelKey);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={() => setPendingHref(item.href)}
                  data-tour={item.tour}
                  title={collapsed ? label : undefined}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`${linkFocus} ${styles.link} relative flex min-h-10 items-center gap-2 rounded-md px-2 text-[13px] font-medium transition-colors ${
                    active ? styles.linkActive : "border border-transparent"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    className={`shrink-0 ${active ? "text-[var(--color-accent)]" : "text-[var(--color-gold)]"}`}
                    aria-hidden
                  />
                  {!collapsed ? <span className="min-w-0 truncate">{label}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className={`${styles.footer} flex shrink-0 ${
          collapsed ? "flex-col items-center gap-1 px-1 py-2" : "items-center gap-1 px-2 py-2"
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          className={`${styles.footerBtn} ui-btn-icon h-10 w-10 min-h-10 min-w-10 rounded-md p-0 ${linkFocus}`}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-expanded={!collapsed}
        >
          <ChevronsLeft size={20} strokeWidth={1.75} className={collapsed ? "rotate-180" : undefined} aria-hidden />
        </button>
        <form action={logoutAction} className={collapsed ? "" : "ml-auto"}>
          <button
            type="submit"
            title={t("nav.logout")}
            aria-label={t("nav.logout")}
            className={`${styles.footerBtn} ui-btn-icon h-10 w-10 min-h-10 min-w-10 rounded-md p-0 ${linkFocus}`}
          >
            <LogOut size={20} strokeWidth={1.75} aria-hidden />
          </button>
        </form>
      </div>
    </aside>
  );
}

export function useSidebarOffsetClass() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(readCollapsed());
    function onCollapse(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsed(typeof detail === "boolean" ? detail : readCollapsed());
    }
    function onStorage() {
      setCollapsed(readCollapsed());
    }
    window.addEventListener(COLLAPSE_EVENT, onCollapse);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COLLAPSE_EVENT, onCollapse);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return collapsed ? "lg:pl-12" : "lg:pl-[180px]";
}
