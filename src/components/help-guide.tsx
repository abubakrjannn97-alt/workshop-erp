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

const DESKTOP_TIP_W = 300;
const MOBILE_TIP_H = 230;
const GAP = 12;

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

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < 1024;
}

function getMainScroller() {
  return document.querySelector("main");
}

function isVisible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  if (r.width < 24 || r.height < 20) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  let node: HTMLElement | null = el;
  while (node) {
    const s = getComputedStyle(node);
    if (s.display === "none" || s.visibility === "hidden") return false;
    node = node.parentElement;
  }
  return true;
}

function findTarget(ids: string[]) {
  const matches: HTMLElement[] = [];
  for (const id of ids) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
      if (isVisible(el)) matches.push(el);
    }
  }
  if (matches.length === 0) return null;

  matches.sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    return rb.width * rb.height - ra.width * ra.height;
  });

  return matches[0];
}

function readRadius(el: HTMLElement, width: number, height: number) {
  const style = getComputedStyle(el);
  const raw = style.borderRadius.trim();
  if (!raw || raw === "0px") return "10px";

  const parts = raw.split(/\s+/).map((part) => parseFloat(part)).filter((n) => !Number.isNaN(n));
  const max = parts.length ? Math.max(...parts) : 0;
  const minSide = Math.min(width, height);

  if (minSide > 0 && max >= minSide / 2 - 0.5) {
    return `${Math.round(minSide / 2)}px`;
  }

  return raw;
}

function measure(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const width = Math.max(1, Math.round(r.width));
  const height = Math.max(1, Math.round(r.height));
  return {
    top: Math.round(r.top),
    left: Math.round(r.left),
    width,
    height,
    radius: readRadius(el, width, height),
  };
}

function viewportPad() {
  const mobile = isMobileViewport();
  return {
    top: mobile ? 72 : 52,
    bottom: mobile ? 112 : 28,
    horizontal: 16,
  };
}

function boxFitsViewport(box: Box, pad = viewportPad()) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return (
    box.top >= pad.top &&
    box.left >= pad.horizontal &&
    box.top + box.height <= vh - pad.bottom &&
    box.left + box.width <= vw - pad.horizontal
  );
}

function revealTarget(el: HTMLElement) {
  const pad = viewportPad();
  const prev = el.style.scrollMargin;
  el.style.scrollMargin = `${pad.top}px ${pad.horizontal}px ${pad.bottom}px ${pad.horizontal}px`;
  el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
  window.setTimeout(() => {
    el.style.scrollMargin = prev;
  }, 500);
}

function nudgeIntoView(el: HTMLElement) {
  if (boxFitsViewport(measure(el))) return;

  const pad = viewportPad();
  const box = measure(el);
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const main = getMainScroller();
  if (main instanceof HTMLElement) {
    const mr = main.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (er.top < mr.top + pad.top) {
      main.scrollTop -= mr.top + pad.top - er.top + 10;
    }
    if (er.bottom > mr.bottom - pad.bottom) {
      main.scrollTop += er.bottom - (mr.bottom - pad.bottom) + 10;
    }
  }

  const next = measure(el);
  let dy = 0;
  if (next.top < pad.top) dy = next.top - pad.top - 8;
  if (next.top + next.height > vh - pad.bottom) dy = next.top + next.height - (vh - pad.bottom) + 8;
  if (dy !== 0) window.scrollBy({ top: dy, behavior: "smooth" });

  const dxLeft = next.left < pad.horizontal ? pad.horizontal - next.left : 0;
  const dxRight = next.left + next.width > vw - pad.horizontal ? next.left + next.width - (vw - pad.horizontal) : 0;
  if (dxLeft > 0 || dxRight > 0) window.scrollBy({ left: dxRight - dxLeft, behavior: "smooth" });
}

async function waitForStableBox(el: HTMLElement, attempts = 10, delay = 50): Promise<Box> {
  let last: Box | null = null;
  let stable = 0;

  for (let i = 0; i < attempts; i++) {
    await new Promise((resolve) => window.setTimeout(resolve, delay));
    const next = measure(el);
    if (
      last &&
      Math.abs(last.top - next.top) < 1 &&
      Math.abs(last.left - next.left) < 1 &&
      Math.abs(last.width - next.width) < 1 &&
      Math.abs(last.height - next.height) < 1
    ) {
      stable += 1;
      if (stable >= 2) return next;
    } else {
      stable = 0;
    }
    last = next;
  }

  return measure(el);
}

type TipLayout = {
  top: number;
  left: number;
  width: number;
  place: "right" | "left" | "bottom" | "top" | "sheet";
  hole: Box;
};

function tipLayoutFor(box: Box, tipHeight = MOBILE_TIP_H): TipLayout {
  const hole = { ...box };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = viewportPad();
  const margin = 16;

  if (isMobileViewport()) {
    const width = vw - margin * 2;
    const below = hole.top + hole.height + GAP;
    const fitsBelow = below + tipHeight <= vh - pad.bottom;
    const top = fitsBelow ? below : Math.max(pad.top, vh - tipHeight - pad.bottom);
    return {
      top,
      left: margin,
      width,
      place: "sheet",
      hole,
    };
  }

  const tipW = Math.min(DESKTOP_TIP_W, vw - margin * 2);

  const candidates: Array<{ place: TipLayout["place"]; top: number; left: number; score: number }> = [];

  function score(top: number, left: number, width: number, height: number) {
    return (
      Math.max(0, pad.top - top) +
      Math.max(0, top + height - (vh - pad.bottom)) +
      Math.max(0, pad.horizontal - left) +
      Math.max(0, left + width - (vw - pad.horizontal))
    );
  }

  const centeredLeft = hole.left + hole.width / 2 - tipW / 2;

  candidates.push({
    place: "bottom",
    top: hole.top + hole.height + GAP,
    left: centeredLeft,
    score: score(hole.top + hole.height + GAP, centeredLeft, tipW, tipHeight),
  });
  candidates.push({
    place: "top",
    top: hole.top - tipHeight - GAP,
    left: centeredLeft,
    score: score(hole.top - tipHeight - GAP, centeredLeft, tipW, tipHeight),
  });
  candidates.push({
    place: "right",
    top: hole.top + hole.height / 2 - tipHeight / 2,
    left: hole.left + hole.width + GAP,
    score: score(hole.top + hole.height / 2 - tipHeight / 2, hole.left + hole.width + GAP, tipW, tipHeight),
  });
  candidates.push({
    place: "left",
    top: hole.top + hole.height / 2 - tipHeight / 2,
    left: hole.left - tipW - GAP,
    score: score(hole.top + hole.height / 2 - tipHeight / 2, hole.left - tipW - GAP, tipW, tipHeight),
  });

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];
  const top = Math.min(Math.max(margin, best.top), vh - tipHeight - margin);
  const left = Math.min(Math.max(margin, best.left), vw - tipW - margin);

  return { top, left, width: tipW, place: best.place, hole };
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
  const [tipLayout, setTipLayout] = useState<TipLayout | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
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
      setTipLayout(null);
      targetRef.current = null;
      return;
    }
    setStep(0);
    setActive(true);
  }, [shouldRun, pageId]);

  const focusStep = useCallback(async (index: number, stepDef: TourStep) => {
    if (stepDef.intro) {
      targetRef.current = null;
      setStep(index);
      setLiveStep(stepDef);
      setBox(null);
      setTipLayout(null);
      return true;
    }

    const el = findTarget(stepDef.targets);
    if (!el) return false;

    targetRef.current = el;
    revealTarget(el);
    nudgeIntoView(el);

    const finalBox = await waitForStableBox(el);
    if (!boxFitsViewport(finalBox)) {
      nudgeIntoView(el);
    }

    const settled = await waitForStableBox(el, 6, 40);
    setStep(index);
    setLiveStep(stepDef);
    setBox(settled);
    setTipLayout(tipLayoutFor(settled));
    return true;
  }, []);

  useEffect(() => {
    if (!active || !shouldRun) return;

    let cancelled = false;
    let tries = 0;
    const from = lastPage.current !== pageId ? 0 : step;
    lastPage.current = pageId ?? lastPage.current;

    async function run(start: number) {
      for (let i = start; i < tour.length; i++) {
        if (cancelled) return;
        const ok = await focusStep(i, tour[i]);
        if (ok) return;
      }

      if (tries++ < 16) {
        window.setTimeout(() => {
          void run(from);
        }, 120);
        return;
      }

      setActive(false);
      setBox(null);
      setLiveStep(null);
      setTipLayout(null);
    }

    void run(from);

    return () => {
      cancelled = true;
    };
  }, [active, shouldRun, step, tour, pageId, focusStep]);

  useEffect(() => {
    const el = targetRef.current;
    if (!active || !el || !liveStep || liveStep.intro) return;

    function refresh() {
      const current = findTarget(liveStep.targets) ?? el;
      if (!current) return;
      const next = measure(current);
      setBox(next);
      setTipLayout(tipLayoutFor(next));
    }

    window.addEventListener("resize", refresh);
    const main = getMainScroller();
    main?.addEventListener("scroll", refresh, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(refresh) : null;
    ro?.observe(el);

    return () => {
      window.removeEventListener("resize", refresh);
      main?.removeEventListener("scroll", refresh);
      ro?.disconnect();
    };
  }, [active, liveStep]);

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
    setTipLayout(null);
    targetRef.current = null;
  }

  function stepReady(s: TourStep) {
    return !!s.intro || !!findTarget(s.targets);
  }

  function next() {
    const from = step + 1;
    for (let i = from; i < tour.length; i++) {
      if (stepReady(tour[i])) {
        setStep(i);
        return;
      }
    }
    finish(false, true);
  }

  function back() {
    for (let i = step - 1; i >= 0; i--) {
      if (stepReady(tour[i])) {
        setStep(i);
        return;
      }
    }
  }

  if (!active || !liveStep || !pageId) return null;
  if (!liveStep.intro && (!box || !tipLayout)) return null;

  const total = tour.length;
  const index = tour.findIndex((s) => s === liveStep);
  const n = (index >= 0 ? index : step) + 1;
  const last = !tour.slice(n).some(stepReady);
  const intro = !!liveStep.intro;

  const card = (
    <>
      <div className="tour-tip-progress" aria-hidden="true">
        {tour.map((item, i) => (
          <span
            key={`${item.title}-${i}`}
            className={`tour-tip-dot ${i === index ? "is-active" : i < index ? "is-done" : ""}`}
          />
        ))}
      </div>
      <p className="tour-tip-step">{t("help.step", { n, total })}</p>
      <h2 id="tour-title" className="tour-tip-title">
        {liveStep.title}
      </h2>
      <p className="tour-tip-text">{liveStep.text}</p>
      <div className="tour-tip-actions">
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
          {last ? t("help.done") : intro && n === 1 ? t("help.start") : t("help.next")}
        </button>
      </div>
      <div className="tour-tip-footer">
        <button type="button" className="tour-tip-muted" onClick={() => finish(true)}>
          {t("help.dontShow")}
        </button>
        <Link href="/help" className="tour-tip-link" onClick={() => finish(false, true)}>
          {t("help.allQuestions")}
        </Link>
      </div>
    </>
  );

  if (intro) {
    return (
      <div className="print:hidden" role="dialog" aria-modal="true" aria-labelledby="tour-title">
        <div className="tour-backdrop fixed inset-0 z-[100]" />
        <div className="tour-tip tour-intro fixed left-1/2 top-[14%] z-[101] w-[min(340px,calc(100vw-32px))] -translate-x-1/2">
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className="print:hidden" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-backdrop fixed inset-0 z-[100]" />

      <div
        className="tour-ring pointer-events-none fixed z-[101]"
        style={{
          top: box!.top,
          left: box!.left,
          width: box!.width,
          height: box!.height,
          borderRadius: box!.radius,
        }}
      />

      <div
        className={`tour-tip ${tipLayout!.place === "sheet" ? "tour-tip--sheet" : `tour-tip--${tipLayout!.place}`} fixed z-[102]`}
        style={{ top: tipLayout!.top, left: tipLayout!.left, width: tipLayout!.width }}
      >
        {card}
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
