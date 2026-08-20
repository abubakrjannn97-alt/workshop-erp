"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronsLeft, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import { WorkshopMark } from "@/components/workshop-mark";
import { ICON_STROKE, NAV_ICONS } from "@/components/nav-icons";
import { isNavItemActive, sidebarGroups, type NavLeaf } from "@core/shared/nav";
import styles from "./sidebar.module.css";

const STORAGE_KEY = "workshop_sidebar_collapsed";
const COLLAPSE_EVENT = "workshop:sidebar-collapse";
const SECONDARY_IDS = new Set(["settings", "help"]);

/** Split company name across two brand lines (last word on row 2). */
function brandLines(name: string): [string, string] {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return [parts.slice(0, -1).join(" "), parts[parts.length - 1]!];
  }
  const single = parts[0] ?? "";
  if (single.length <= 10) return [single, ""];
  const mid = Math.ceil(single.length / 2);
  return [single.slice(0, mid), single.slice(mid)];
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

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function NavLink({
  item,
  active,
  collapsed,
  label,
  onNavigate,
}: {
  item: NavLeaf;
  active: boolean;
  collapsed: boolean;
  label: string;
  onNavigate: (href: string) => void;
}) {
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      prefetch
      onClick={() => onNavigate(item.href)}
      data-tour={item.tour}
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`${styles.link} ${active ? styles.linkActive : ""} ${collapsed ? styles.linkCollapsed : ""}`}
    >
      <Icon size={14} strokeWidth={ICON_STROKE} className={styles.icon} aria-hidden />
      {!collapsed ? <span className={styles.label}>{label}</span> : null}
    </Link>
  );
}

export function Sidebar({
  companyName,
  userName,
  roleName,
  permissions,
  roleCode,
  locale,
}: {
  companyName: string;
  userName?: string;
  roleName?: string;
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
  const primaryGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !SECONDARY_IDS.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);
  const secondaryItems = groups.flatMap((group) => group.items).filter((item) => SECONDARY_IDS.has(item.id));
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
      className={`${styles.sidebar} z-30 hidden h-full shrink-0 flex-col print:hidden lg:flex ${
        collapsed ? styles.sidebarCollapsed : ""
      }`}
      aria-label={t("nav.menu")}
    >
      <div className={`${styles.brand} ${collapsed ? styles.brandCollapsed : ""}`}>
        <WorkshopMark size={collapsed ? 22 : 28} className={styles.brandLogo} />
        {!collapsed ? (
          <div className={styles.brandText} title={companyName}>
            {brandLines(companyName).map((line, i) =>
              line ? (
                <span key={i} className={i === 0 ? styles.brandLine : styles.brandLineStrong}>
                  {line}
                </span>
              ) : null,
            )}
          </div>
        ) : null}
        <button
          type="button"
          onClick={toggle}
          className={styles.footerBtn}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          aria-expanded={!collapsed}
        >
          <ChevronsLeft size={14} strokeWidth={ICON_STROKE} className={collapsed ? "rotate-180" : undefined} aria-hidden />
        </button>
      </div>

      <nav className={styles.nav}>
        {primaryGroups.map((group) => (
          <div key={group.id} className={styles.group}>
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isNavItemActive(activePath, item.href)}
                collapsed={collapsed}
                label={t(item.labelKey)}
                onNavigate={setPendingHref}
              />
            ))}
          </div>
        ))}

        {secondaryItems.length > 0 ? (
          <div className={`${styles.group} ${styles.secondary}`}>
            {secondaryItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isNavItemActive(activePath, item.href)}
                collapsed={collapsed}
                label={t(item.labelKey)}
                onNavigate={setPendingHref}
              />
            ))}
          </div>
        ) : null}
      </nav>

      <div className={`${styles.account} ${collapsed ? styles.accountCollapsed : ""}`}>
        <span className={styles.avatar} aria-hidden>
          {initialsOf(userName ?? "") || "U"}
        </span>
        {!collapsed && userName ? (
          <div className={styles.userMeta}>
            <p className={styles.userName}>{userName}</p>
            {roleName ? <p className={styles.userRole}>{roleName}</p> : null}
            <p className={styles.userStatus}>
              <span className={styles.onlineDot} aria-hidden />
              {t("nav.online")}
            </p>
          </div>
        ) : null}
        <form action={logoutAction} className={collapsed ? undefined : "ml-auto"}>
          <button type="submit" title={t("nav.logout")} aria-label={t("nav.logout")} className={styles.footerBtn}>
            <LogOut size={14} strokeWidth={ICON_STROKE} aria-hidden />
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
  return collapsed ? "lg:pl-[var(--sidebar-collapsed)]" : "lg:pl-[var(--sidebar-w)]";
}
