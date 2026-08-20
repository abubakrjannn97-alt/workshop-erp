"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";

const DISMISS_KEY = "workshop_pwa_install_dismissed_v2";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

/** Real Safari only — Chrome/Firefox on iOS cannot create a standalone Home Screen app. */
function isIosSafari() {
  if (!isIos()) return false;
  const ua = navigator.userAgent;
  const isCriOS = /CriOS/i.test(ua);
  const isFxiOS = /FxiOS/i.test(ua);
  const isEdgiOS = /EdgiOS/i.test(ua);
  const isOPiOS = /OPiOS|OPT\//i.test(ua);
  return !isCriOS && !isFxiOS && !isEdgiOS && !isOPiOS;
}

function isMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches || isIos();
}

export function PwaInstall({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const path = usePathname();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<"android" | "ios-safari" | "ios-other">("android");

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (!isMobile()) return;

    if (isIos()) {
      setMode(isIosSafari() ? "ios-safari" : "ios-other");
      setVisible(true);
      return;
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("android");
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

  if (!visible || isStandalone()) return null;

  const desc =
    mode === "ios-other"
      ? t("pwa.iosOpenSafari")
      : mode === "ios-safari"
        ? t("pwa.iosHint")
        : t("pwa.installDesc");

  return (
    <div
      className="fixed inset-x-3 z-[60] print:hidden lg:hidden"
      style={{ bottom: "calc(var(--mobile-chrome-bottom, 0px) + 12px)" }}
    >
      <div className="rounded-2xl border border-[rgba(232,201,120,0.35)] bg-[#0e1522] p-4 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <p className="text-sm font-semibold text-[#E8C978]">{t("pwa.installTitle")}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">{desc}</p>
        {mode === "ios-safari" ? (
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-slate-300">
            <li>{t("pwa.iosStep1")}</li>
            <li>{t("pwa.iosStep2")}</li>
            <li>{t("pwa.iosStep3")}</li>
          </ol>
        ) : null}
        <div className="mt-3 flex gap-2">
          {mode === "android" && deferred ? (
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
