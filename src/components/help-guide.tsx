"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconHelp } from "@/components/icons";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import {
  HELP_REPLAY,
  HELP_RESTORE,
  HINT_HIDDEN_KEY,
  HINTS_OFF_KEY,
  helpTour,
  pageIdFromPath,
  type HelpPageId,
  type TourStep,
} from "@/lib/help";

type Box = { top: number; left: number; width: number; height: number; radius: string };

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function readHidden(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(HINT_HIDDEN_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writeHidden(map: Record<string, boolean>) {
  try {
    localStorage.setItem(HINT_HIDDEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function isVisible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  return true;
}

function findTarget(ids: string[]) {
  for (const id of ids) {
    const nodes = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`);
    for (const el of nodes) {
      if (isVisible(el)) return el;
    }
  }
  return null;
}

function measure(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const radius = getComputedStyle(el).borderRadius || "6px";
  return { top: r.top, left: r.left, width: r.width, height: r.height, radius };
}

const TIP_W = 320;
const GAP = 12;

function tipPos(box: Box) {
  const hole = {
    top: box.top,
    left: box.left,
    width: box.width,
    height: box.height,
  };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = vw - (hole.left + hole.width);
  const bottom = vh - (hole.top + hole.height);
  let top = hole.top;
  let left = hole.left + hole.width + GAP;
  let place: "right" | "left" | "bottom" | "top" = "right";

  if (right < TIP_W + 16 && hole.left > TIP_W + 24) {
    left = hole.left - TIP_W - GAP;
    place = "left";
  } else if (right < TIP_W + 16) {
    left = Math.min(Math.max(12, hole.left), vw - TIP_W - 12);
    if (bottom > 200) {
      top = hole.top + hole.height + GAP;
      place = "bottom";
    } else {
      top = Math.max(12, hole.top - 210);
      place = "top";
    }
  }

  top = Math.min(Math.max(12, top), vh - 200);
  left = Math.min(Math.max(12, left), vw - TIP_W - 12);
  return { top, left, place, hole };
}

export function HelpGuide({ locale }: { locale: Locale }) {
  const path = usePathname();
  const t = createT(locale);
  const pageId = useMemo(() => pageIdFromPath(path), [path]);
  const tour = useMemo(() => (pageId ? helpTour(locale, pageId) : []), [locale, pageId]);

  const [ready, setReady] = useState(false);
  const [hintsOff, setHintsOff] = useState(false);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [liveStep, setLiveStep] = useState<TourStep | null>(null);
  const lastPage = useRef<HelpPageId | null>(null);

  const load = useCallback(() => {
    setHintsOff(readFlag(HINTS_OFF_KEY));
    setHidden(readHidden());
    setReady(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onReplay() {
      writeFlag(HINTS_OFF_KEY, false);
      writeHidden({});
      setHintsOff(false);
      setHidden({});
    }
    function onRestore() {
      writeFlag(HINTS_OFF_KEY, false);
      writeHidden({});
      setHintsOff(false);
      setHidden({});
    }
    window.addEventListener(HELP_REPLAY, onReplay);
    window.addEventListener(HELP_RESTORE, onRestore);
    return () => {
      window.removeEventListener(HELP_REPLAY, onReplay);
      window.removeEventListener(HELP_RESTORE, onRestore);
    };
  }, []);

  const shouldRun = ready && !!pageId && !hintsOff && !hidden[pageId ?? ""] && tour.length > 0;

  useEffect(() => {
    if (!shouldRun) {
      setActive(false);
      setBox(null);
      setLiveStep(null);
      return;
    }
    setStep(0);
    setActive(true);
  }, [shouldRun, pageId]);

  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";

    function block(e: Event) {
      e.preventDefault();
    }
    function onKey(e: KeyboardEvent) {
      const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"];
      if (keys.includes(e.key)) e.preventDefault();
    }
    window.addEventListener("wheel", block, { passive: false });
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("scroll", block, { capture: true });
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("scroll", block, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  useEffect(() => {
    if (!active || !shouldRun) return;

    let cancelled = false;
    let tries = 0;
    let targets: string[] = [];
    const from = lastPage.current !== pageId ? 0 : step;
    lastPage.current = pageId ?? lastPage.current;

    function pick(start: number) {
      for (let i = start; i < tour.length; i++) {
        const el = findTarget(tour[i].targets);
        if (el) return { i, el, s: tour[i] };
      }
      return null;
    }

    function apply(found: { i: number; el: HTMLElement; s: TourStep }) {
      targets = found.s.targets;
      found.el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      window.setTimeout(() => {
        if (cancelled) return;
        const el = findTarget(found.s.targets) ?? found.el;
        setStep(found.i);
        setLiveStep(found.s);
        setBox(measure(el));
      }, 200);
    }

    function run() {
      const found = pick(from);
      if (!found) {
        if (tries++ < 12) {
          window.setTimeout(run, 80);
          return;
        }
        setActive(false);
        setBox(null);
        setLiveStep(null);
        return;
      }
      apply(found);
    }

    run();

    function onMove() {
      const el = findTarget(targets);
      if (el) setBox(measure(el));
    }
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [active, shouldRun, step, tour, pageId]);

  function finish(hideForever: boolean, hidePage = true) {
    if (hideForever) {
      writeFlag(HINTS_OFF_KEY, true);
      setHintsOff(true);
    } else if (hidePage && pageId) {
      const next = { ...hidden, [pageId]: true };
      writeHidden(next);
      setHidden(next);
    }
    setActive(false);
    setBox(null);
    setLiveStep(null);
  }

  function next() {
    const from = step + 1;
    for (let i = from; i < tour.length; i++) {
      if (findTarget(tour[i].targets)) {
        setStep(i);
        return;
      }
    }
    finish(false, true);
  }

  function back() {
    for (let i = step - 1; i >= 0; i--) {
      if (findTarget(tour[i].targets)) {
        setStep(i);
        return;
      }
    }
  }

  if (!active || !box || !liveStep || !pageId) return null;

  const layout = tipPos(box);
  const { hole } = layout;
  const total = tour.length;
  const index = tour.findIndex((s) => s === liveStep);
  const n = (index >= 0 ? index : step) + 1;
  const last = !tour.slice(n).some((s) => findTarget(s.targets));

  const dim = "tour-dim";

  return (
    <div className="print:hidden" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div
        className="fixed inset-0 z-[69]"
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />
      <div className={`fixed inset-x-0 top-0 z-[70] ${dim}`} style={{ height: Math.max(0, hole.top) }} />
      <div
        className={`fixed left-0 z-[70] ${dim}`}
        style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }}
      />
      <div
        className={`fixed z-[70] ${dim}`}
        style={{
          top: hole.top,
          left: hole.left + hole.width,
          right: 0,
          height: hole.height,
        }}
      />
      <div
        className={`fixed inset-x-0 bottom-0 z-[70] ${dim}`}
        style={{ top: hole.top + hole.height }}
      />

      <div
        className="tour-spot pointer-events-none fixed z-[72]"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          borderRadius: box.radius,
        }}
      />
      <div
        className="fixed z-[71]"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          borderRadius: box.radius,
        }}
      />

      <div
        className="tour-tip fixed z-[73] w-[min(320px,calc(100vw-24px))]"
        style={{ top: layout.top, left: layout.left }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--tour)]">
          {t("help.step", { n, total })}
        </p>
        <h2 id="tour-title" className="mt-1 text-[16px] font-semibold text-white">
          {liveStep.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/80">{liveStep.text}</p>
        <div className="mt-4 flex items-center gap-2">
          {n > 1 ? (
            <button type="button" className="tour-btn-ghost" onClick={back}>
              {t("help.back")}
            </button>
          ) : (
            <button type="button" className="tour-btn-ghost" onClick={() => finish(false, true)}>
              {t("help.skip")}
            </button>
          )}
          <button type="button" className="tour-btn-next ml-auto" onClick={next}>
            {last ? t("help.done") : t("help.next")}
          </button>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <button type="button" className="text-[11px] text-white/45 hover:text-white/80" onClick={() => finish(true)}>
            {t("help.dontShow")}
          </button>
          <Link href="/help" className="text-[11px] font-medium text-[var(--tour)] hover:underline" onClick={() => finish(false, true)}>
            {t("help.allQuestions")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HelpHeaderLink({ locale }: { locale: Locale }) {
  const t = createT(locale);
  return (
    <Link
      href="/help"
      data-tour="tour-help"
      title={t("nav.help")}
      aria-label={t("nav.help")}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#667085] hover:border-[#D4AF37]/40 hover:text-[#101828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/40"
    >
      <IconHelp size={13} />
    </Link>
  );
}
