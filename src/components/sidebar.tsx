"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  House,
  ShoppingCart,
  Users,
  ClipboardList,
  Package,
  Factory,
  Warehouse,
  Truck,
  Wallet,
  UserRound,
  ChartColumn,
  Settings,
  CircleQuestionMark,
  ChevronsLeft,
  LogOut,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import { WorkshopMark } from "@/components/workshop-mark";
import { sidebarGroups, type NavIcon } from "@/lib/nav";
import styles from "./sidebar.module.css";

const STORAGE_KEY = "workshop_sidebar_collapsed";
const COLLAPSE_EVENT = "workshop:sidebar-collapse";

const ICON: Record<NavIcon, LucideIcon> = {
  home: House,
  sales: ShoppingCart,
  crm: Users,
  orders: ClipboardList,
  products: Package,
  production: Factory,
  warehouse: Warehouse,
  purchasing: Truck,
  finance: Wallet,
  employees: UserRound,
  analytics: ChartColumn,
  settings: Settings,
  help: CircleQuestionMark,
  more: Settings,
  commission: Wallet,
  batches: ClipboardList,
  scrap: CircleQuestionMark,
  inventory: Warehouse,
  expenses: Wallet,
  jobs: Factory,
  history: ClipboardList,
  profile: UserRound,
  reports: ChartColumn,
  notifications: CircleQuestionMark,
  search: CircleQuestionMark,
};

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

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
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/40 focus-visible:ring-offset-0";

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
    >
      <div className={`${styles.brand} flex h-10 shrink-0 items-center ${collapsed ? "justify-center px-1" : "gap-1.5 px-2"}`}>
        <WorkshopMark size={collapsed ? 28 : 32} className="rounded-[22%]" />
        {!collapsed ? (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[#D4AF37]">
              Produsion System
            </p>
            <p className="truncate text-[11px] font-semibold text-white">{companyName}</p>
          </div>
        ) : null}
      </div>

      <nav className={`${styles.nav} min-h-0 flex-1 overflow-hidden px-1`} aria-label={t("nav.menu")}>
        {groups.map((group) => (
          <div key={group.id}>
            {group.labelKey && !collapsed ? (
              <p className={`${styles.groupLabel} px-2 pb-px pt-1 text-[8px] font-semibold uppercase tracking-[0.12em]`}>
                {t(group.labelKey)}
              </p>
            ) : collapsed ? (
              <div className="h-1.5" />
            ) : null}
            {group.items.map((item) => {
              const active = isActive(pendingHref ?? path, item.href);
              const Icon = ICON[item.icon];
              const label = t(item.labelKey);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={() => setPendingHref(item.href)}
                  data-tour={item.tour}
                  title={label}
                  aria-current={active ? "page" : undefined}
                  className={`${linkFocus} ${styles.link} relative flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium transition-colors ${
                    active ? styles.linkActive : "border border-transparent"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon
                    size={14}
                    strokeWidth={1.6}
                    className={`shrink-0 ${active ? "text-[#F5D56A]" : "text-[#D4AF37]"}`}
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
          collapsed ? "flex-col items-center gap-0 px-1 py-1" : "items-center gap-0 px-1.5 py-1"
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          className={`${styles.footerBtn} rounded-md p-1.5 ${linkFocus}`}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-expanded={!collapsed}
        >
          <ChevronsLeft size={14} strokeWidth={1.6} className={collapsed ? "rotate-180" : undefined} />
        </button>
        <form action={logoutAction} className={collapsed ? "" : "ml-auto"}>
          <button
            type="submit"
            title={t("nav.logout")}
            aria-label={t("nav.logout")}
            className={`${styles.footerBtn} rounded-md p-1.5 ${linkFocus}`}
          >
            <LogOut size={14} strokeWidth={1.6} />
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
