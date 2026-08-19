"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloudOff, CloudUpload, RefreshCw } from "lucide-react";
import type { Locale } from "@core/shared/i18n/i18n";
import { translate } from "@core/shared/i18n/i18n";
import { flushQueue, getPendingCount } from "@/lib/offline/sync";

export function OfflineSync({ locale }: { locale: Locale }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await getPendingCount());
    } catch {
      setPending(0);
    }
  }, []);

  const runSync = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      await flushQueue();
      await refreshPending();
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshPending]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshPending();

    const onOnline = () => {
      setOnline(true);
      void runSync();
    };
    const onOffline = () => setOnline(false);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        refreshPending();
        if (navigator.onLine) void runSync();
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVis);
    const timer = window.setInterval(() => {
      refreshPending();
      if (navigator.onLine) void runSync();
    }, 60_000);

    if (navigator.onLine) void runSync();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(timer);
    };
  }, [refreshPending, runSync]);

  useEffect(() => {
    const onQueued = () => refreshPending();
    window.addEventListener("offline-queue-changed", onQueued);
    return () => window.removeEventListener("offline-queue-changed", onQueued);
  }, [refreshPending]);

  if (online && pending === 0) return null;

  const t = (key: string) => translate(locale, key);

  return (
    <div
      className="fixed inset-x-0 z-[90] flex justify-center px-3 print:hidden"
      style={{ top: "calc(var(--mobile-chrome-top) + 4px)" }}
    >
      <div
        className={`flex max-w-md items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-md ${
          online
            ? "border border-[rgba(232,201,120,0.45)] bg-[#FFFBF2] text-[#5C4A1F]"
            : "border border-white/10 bg-[rgba(11,14,26,0.92)] text-white"
        }`}
      >
        {!online ? (
          <CloudOff size={14} strokeWidth={1.75} className="shrink-0" />
        ) : syncing ? (
          <RefreshCw size={14} strokeWidth={1.75} className="shrink-0 animate-spin" />
        ) : (
          <CloudUpload size={14} strokeWidth={1.75} className="shrink-0" />
        )}
        <span className="min-w-0 flex-1 leading-snug">
          {!online
            ? pending > 0
              ? t("offline.bannerOffPending").replace("{n}", String(pending))
              : t("offline.bannerOff")
            : pending > 0
              ? t("offline.bannerSyncPending").replace("{n}", String(pending))
              : t("offline.bannerSyncing")}
        </span>
        {online && pending > 0 && !syncing ? (
          <button
            type="button"
            onClick={() => void runSync()}
            className="shrink-0 rounded-full bg-[#E8C978] px-2 py-0.5 text-[10px] font-semibold text-[#14110D]"
          >
            {t("offline.syncNow")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function notifyOfflineQueueChanged() {
  window.dispatchEvent(new Event("offline-queue-changed"));
}
