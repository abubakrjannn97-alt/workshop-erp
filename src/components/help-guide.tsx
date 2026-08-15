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

const TIP_W = 300;
const TIP_H = 248;
const GAP = 14;

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

function readRadius(el: HTMLElement, width: number, height: number) {
  const style = getComputedStyle(el);
  const raw = style.borderRadius.trim();
  if (!raw || raw === "0px") return "8px";

  const parts = raw.split(/\s+/).map((part) => parseFloat(part)).filter((n) => !Number.isNaN(n));
  const max = parts.length ? Math.max(...parts) : 0;
  const minSide = Math.min(width, height);

  if (minSide > 0 && max >= minSide / 2 - 0.5) {
    return `${minSide / 2}px`;
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
  const mobile = window.innerWidth < 1024;
  return {
    top: mobile ? 76 : 56,
    bottom: mobile ? 108 : 36,
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
  el.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });

  window.setTimeout(() => {
    el.style.scrollMargin = prev;
  }, 700);
}

function nudgeIntoView(el: HTMLElement) {
  const box = measure(el);
  if (boxFitsViewport(box)) return;

  const pad = viewportPad();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  let dy = 0;
  let dx = 0;

  if (box.top < pad.top) dy = box.top - pad.top - 8;
  if (box.top + box.height > vh - pad.bottom) dy = box.top + box.height - (vh - pad.bottom) + 8;
  if (box.left < pad.horizontal) dx = box.left - pad.horizontal - 8;
  if (box.left + box.width > vw - pad.horizontal) dx = box.left + box.width - (vw - pad.horizontal) + 8;

  if (dy !== 0 || dx !== 0) {
    window.scrollBy({ top: dy, left: dx, behavior: "smooth" });
  }

  let parent = el.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const scrollable =
      parent.scrollHeight > parent.clientHeight + 1 &&
      (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflow === "auto");
    if (scrollable) {
      const pr = parent.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      if (er.top < pr.top + pad.top) parent.scrollTop -= pr.top + pad.top - er.top + 8;
      if (er.bottom > pr.bottom - pad.bottom) parent.scrollTop += er.bottom - (pr.bottom - pad.bottom) + 8;
    }
    parent = parent.parentElement;
  }
}

function waitForStableBox(el: HTMLElement, attempts = 8, delay = 60): Promise<Box> {
  return new Promise((resolve) => {
    let last: Box | null = null;
    let stable = 0;
    let left = attempts;

    function tick() {
      const next = measure(el);
      if (
        last &&
        Math.abs(last.top - next.top) < 1 &&
        Math.abs(last.left - next.left) < 1 &&
        Math.abs(last.width - next.width) < 1 &&
        Math.abs(last.height - next.height) < 1
      ) {
        stable += 1;
      } else {
        stable = 0;
      }
      last = next;
      left -= 1;

      if (stable >= 2 || left <= 0) {
        resolve(next);
        return;
      }
      window.setTimeout(tick, delay);
    }

    tick();
  });
}

type TipLayout = {
  top: number;
  left: number;
  place: "right" | "left" | "bottom" | "top";
  hole: Box;
};

function tipPos(box: Box, tipHeight = TIP_H): TipLayout {
  const hole = { ...box };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = viewportPad();
  const margin = 12;

  const candidates: Array<{ place: TipLayout["place"]; top: number; left: number; score: number }> = [];

  function score(top: number, left: number, width: number, height: number) {
    const overflow =
      Math.max(0, pad.top - top) +
      Math.max(0, top + height - (vh - pad.bottom)) +
      Math.max(0, pad.horizontal - left) +
      Math.max(0, left + width - (vw - pad.horizontal));
    const centerBias = Math.abs(top + height / 2 - vh / 2) * 0.02;
    return overflow * 100 + centerBias;
  }

  const centeredLeft = hole.left + hole.width / 2 - TIP_W / 2;

  candidates.push({
    place: "bottom",
    top: hole.top + hole.height + GAP,
    left: centeredLeft,
    score: score(hole.top + hole.height + GAP, centeredLeft, TIP_W, tipHeight),
  });
  candidates.push({
    place: "top",
    top: hole.top - tipHeight - GAP,
    left: centeredLeft,
    score: score(hole.top - tipHeight - GAP, centeredLeft, TIP_W, tipHeight),
  });
  candidates.push({
    place: "right",
    top: hole.top + hole.height / 2 - tipHeight / 2,
    left: hole.left + hole.width + GAP,
    score: score(hole.top + hole.height / 2 - tipHeight / 2, hole.left + hole.width + GAP, TIP_W, tipHeight),
  });
  candidates.push({
    place: "left",
    top: hole.top + hole.height / 2 - tipHeight / 2,
    left: hole.left - TIP_W - GAP,
    score: score(hole.top + hole.height / 2 - tipHeight / 2, hole.left - TIP_W - GAP, TIP_W, tipHeight),
  });

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];

  const top = Math.min(Math.max(margin, best.top), vh - tipHeight - margin);
  const left = Math.min(Math.max(margin, best.left), vw - TIP_W - margin);

  return { top, left, place: best.place, hole };
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
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.overscrollBehavior = prevBodyOverscroll;
      window.removeEventListener("wheel", block);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const focusStep = useCallback(
    async (index: number, stepDef: TourStep) => {
      const el = findTarget(stepDef.targets);
      if (!el) return false;

      targetRef.current = el;
      revealTarget(el);
      nudgeIntoView(el);

      const measured = await waitForStableBox(el);
      if (!boxFitsViewport(measured)) {
        nudgeIntoView(el);
      }

      const finalBox = await waitForStableBox(el, 6, 50);
      setStep(index);
      setLiveStep(stepDef);
      setBox(finalBox);
      setTipLayout(tipPos(finalBox));
      return true;
    },
    [],
  );

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
        }, 100);
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
    if (!active || !el) return;

    function refresh() {
      const current = findTarget(liveStep?.targets ?? []) ?? el;
      if (!current) return;
      const next = measure(current);
      setBox(next);
      setTipLayout(tipPos(next));
    }

    window.addEventListener("resize", refresh);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(refresh) : null;
    ro?.observe(el);

    return () => {
      window.removeEventListener("resize", refresh);
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

  if (!active || !box || !liveStep || !tipLayout || !pageId) return null;

  const { hole } = tipLayout;
  const total = tour.length;
  const index = tour.findIndex((s) => s === liveStep);
  const n = (index >= 0 ? index : step) + 1;
  const last = !tour.slice(n).some((s) => findTarget(s.targets));

  return (
    <div className="print:hidden" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div
        className="fixed inset-0 z-[69]"
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      <div
        className="tour-cutout pointer-events-none fixed z-[70]"
        style={{
          top: hole.top,
          left: hole.left,
          width: hole.width,
          height: hole.height,
          borderRadius: box.radius,
        }}
      />

      <div
        className={`tour-tip tour-tip--${tipLayout.place} fixed z-[73]`}
        style={{ top: tipLayout.top, left: tipLayout.left, width: TIP_W }}
      >
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
            {last ? t("help.done") : t("help.next")}
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
