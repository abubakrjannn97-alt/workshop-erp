# Produsion System — Design System

Premium enterprise UI for Workshop ERP. Calm Command Center.

## Tokens (`globals.css` `:root`)

| Token | Value | Use |
|---|---|---|
| `--color-sidebar` | `#0B1423` | Sidebar, KPI body |
| `--color-sidebar-soft` | `#111D2E` | Active nav surface |
| `--color-navy` / `-light` | `#0E1726` / `#162236` | Navy accents |
| `--color-background` | `#F7F8FA` | App canvas |
| `--color-surface` | `#FFFFFF` | Cards, header |
| `--color-surface-soft` | `#F9FAFB` | Hover rows |
| `--color-border` | `#E5E7EB` | Hairlines |
| `--color-gold` | `#D4A437` | Brand / primary CTA / active |
| `--color-success` | `#16A36A` | Positive |
| `--color-info` | `#3382F6` | In progress |
| `--color-danger` | `#EF4444` | Debt / errors |
| `--color-warning` | `#F59E0B` | Caution |
| `--color-text-primary` | `#101828` | Body text |
| `--color-text-secondary` | `#667085` | Secondary |
| `--color-text-muted` | `#98A2B3` | Captions |

Legacy aliases (`--navy`, `--gold`, `--border`, `--ui-*` vars) map to these tokens.

## Typography

- Font: **Inter** (`latin` + `cyrillic`) via `next/font`
- H1 / `.page-title`: 28px / 700
- Section: 16px / 600
- Body: 14px / 400–500
- KPI numbers: 28px / 700 tabular
- Captions: 11–12px muted

## Shell

- Sidebar: 248px (`#0B1423`), collapsed 64px
- Active nav: soft navy + thin gold border + gold icon
- Header: 72px white, search max 520px / 48px tall
- Content padding: 32px desktop

## Components

| Component | Path |
|---|---|
| `PageHeader` | `src/components/page-header.tsx` |
| `KpiCard` | dark navy, gold wave, trend pill |
| `DashPanel` | white section card |
| `QuickAction` | compact action row |
| `StatusBadge` | pill tones |
| `EmptyState` | empty lists |
| `.ui-card` / `.ui-btn*` / `.ui-input` / `.ui-table` | global utilities |

## Rules

- No rainbow KPI caps
- Gold sparingly (active, CTA, profit highlight)
- Soft shadows only (`--shadow-card`)
- One table / form / badge language app-wide
- Do not change business logic for UI
