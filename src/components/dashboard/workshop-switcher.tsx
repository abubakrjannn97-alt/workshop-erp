"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { switchWorkshopAction } from "@/app/actions/workshops";
import styles from "./dash-home.module.css";

type WorkshopOption = { id: string; name: string; slug: string };

export function WorkshopSwitcher({
  workshops,
  activeId,
}: {
  workshops: WorkshopOption[];
  activeId: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  const active = workshops.find((ws) => ws.id === activeId) ?? workshops[0];

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function onSwitch(id: string) {
    if (id === activeId || pending) return;
    startTransition(async () => {
      const result = await switchWorkshopAction(id);
      if (!result.ok) setError(result.error);
      else {
        setError("");
        setMenuOpen(false);
      }
    });
  }

  if (!active) return null;

  return (
    <div ref={wrapRef} className={styles.workshopPicker}>
      <button
        type="button"
        className={styles.workshopPickerBtn}
        aria-expanded={menuOpen}
        aria-haspopup="listbox"
        aria-label={active.name}
        disabled={pending}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className={styles.workshopPickerLabel}>{active.name}</span>
        <ChevronDown
          size={14}
          strokeWidth={ICON_STROKE}
          className={`${styles.profitPeriodChevron} ${menuOpen ? styles.profitPeriodChevronOpen : ""}`}
          aria-hidden
        />
      </button>

      {menuOpen ? (
        <div className={styles.workshopMenu}>
          <ul className={styles.workshopMenuList} role="listbox" aria-label="Цеха">
            {workshops.map((ws) => (
              <li key={ws.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={ws.id === activeId}
                  className={`${styles.workshopMenuItem} ${ws.id === activeId ? styles.workshopMenuItemActive : ""}`}
                  disabled={pending}
                  onClick={() => onSwitch(ws.id)}
                >
                  {ws.name}
                </button>
              </li>
            ))}
          </ul>
          {error ? <p className={styles.workshopMenuError}>{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
