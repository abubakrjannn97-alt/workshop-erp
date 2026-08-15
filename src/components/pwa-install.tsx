"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";

const DISMISS_KEY = "workshop_pwa_install_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

export function PwaInstall({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const path = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;

    if (isIos() && isMobile()) {
      setIosHint(true);
      setVisible(true);
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    if (isStandalone()) setVisible(false);
  }, [path]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
  };

  if (!visible || path.startsWith("/login")) return null;

  return (
    <div
      className="fixed inset-x-3 z-[60] print:hidden lg:hidden"
      style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="rounded-2xl border border-[rgba(232,201,120,0.35)] bg-[#0e1522] p-4 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <p className="text-sm font-semibold text-[#E8C978]">{t("pwa.installTitle")}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          {iosHint ? t("pwa.iosHint") : t("pwa.installDesc")}
        </p>
        <div className="mt-3 flex gap-2">
          {!iosHint ? (
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-[#E8C978] px-3 py-2 text-xs font-semibold text-[#0e1522]"
            >
              {t("pwa.installBtn")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-slate-200"
          >
            {t("pwa.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
