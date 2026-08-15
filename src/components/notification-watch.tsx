"use client";

import { useEffect, useRef } from "react";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";

type Item = { id: string; title: string; body: string };

export function NotificationWatch({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const seen = useRef(new Set<string>());
  const ready = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }

    let cancelled = false;
    async function tick() {
      try {
        const res = await fetch("/api/notifications/poll", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items?: Item[] };
        const items = data.items ?? [];
        if (!ready.current) {
          for (const item of items) seen.current.add(item.id);
          ready.current = true;
          return;
        }
        for (const item of items) {
          if (seen.current.has(item.id)) continue;
          seen.current.add(item.id);
          if (!("Notification" in window) || Notification.permission !== "granted") continue;
          const n = new Notification(item.title || t("notif.webTitle"), {
            body: item.body,
            tag: item.id,
            icon: "/icon-192.png",
          });
          n.onclick = () => {
            window.focus();
            window.location.href = "/notifications";
          };
        }
      } catch {
        /* offline: server remains source of truth */
      }
    }

    tick();
    const id = window.setInterval(tick, 45000);
    const onVis = () => {
      if (!cancelled && document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [t]);

  return null;
}
