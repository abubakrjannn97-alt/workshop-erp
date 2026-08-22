"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { createWorkshopAction, switchWorkshopAction } from "@/app/actions/workshops";
import styles from "./dash-home.module.css";

type WorkshopOption = { id: string; name: string; slug: string };

export function WorkshopSwitcher({
  workshops,
  activeId,
  addLabel,
  placeholder,
  canAdd,
}: {
  workshops: WorkshopOption[];
  activeId: string;
  addLabel: string;
  placeholder: string;
  canAdd: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function onSwitch(id: string) {
    if (id === activeId || pending) return;
    startTransition(async () => {
      const result = await switchWorkshopAction(id);
      if (!result.ok) setError(result.error);
      else setError("");
    });
  }

  function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !name.trim()) return;
    startTransition(async () => {
      const result = await createWorkshopAction(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError("");
      setName("");
      setAdding(false);
    });
  }

  return (
    <div className={styles.workshopBar}>
      <div className={styles.workshopPills} role="tablist" aria-label="Цеха">
        {workshops.map((ws) => {
          const active = ws.id === activeId;
          return (
            <button
              key={ws.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? styles.workshopPillActive : styles.workshopPill}
              disabled={pending}
              onClick={() => onSwitch(ws.id)}
            >
              {ws.name}
            </button>
          );
        })}
        {canAdd ? (
          <button
            type="button"
            className={styles.workshopAddBtn}
            aria-label={addLabel}
            title={addLabel}
            disabled={pending}
            onClick={() => setAdding((v) => !v)}
          >
            <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
        ) : null}
      </div>

      {adding ? (
        <form className={styles.workshopAddForm} onSubmit={onCreate}>
          <input
            className={styles.workshopAddInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={placeholder}
            autoFocus
            maxLength={60}
          />
          <button type="submit" className={styles.workshopAddSubmit} disabled={pending || name.trim().length < 2}>
            OK
          </button>
        </form>
      ) : null}

      {error ? <p className={styles.workshopError}>{error}</p> : null}
    </div>
  );
}
