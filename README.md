# Workshop ERP / MRP

Система автоматизации производственного цеха (плитка / камень) по `TZ.md`.

Рабочая копия: `E:\workshop-erp`

## Что внутри (по фазам ТЗ §77)

- PHASE 1–8: foundation, продукция/рецептуры, склад/закупки, CRM/заказы, производство, финансы, payroll, approvals
- PHASE 9: отчёты и KPI — раздел **Аналитика** (`/analytics`) + сводка на главной
  - Маржинальная прибыль (без постоянных расходов) и Чистая прибыль — раздельно (TZ §10)
  - Таблица по каждому изделию (TZ §44)
- PHASE 10: PWA (`manifest` + `icon-192/512.png` + `apple-touch-icon.png`), mobile nav, печать, backup/restore, unit-тесты

## Отчёты

1. **Аналитика** — `/analytics`
2. **Главная** — `/` (сводка владельца)
3. CSV / печать — из карточек заказа, производства и склада (`…/print`)

## Запуск

```powershell
cd E:\workshop-erp
.\scripts\start-postgres.ps1
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

PostgreSQL: `127.0.0.1:5433`, данные: `E:\workshop-erp\.data\pgdata` (не в git).

Демо-вход после seed:

- email: `owner@workshop.local`
- password: `ChangeMeNow!`

Скопируйте `.env.example` → `.env` и задайте свой `AUTH_SECRET`.  
Локальный тест без логина: `AUTH_BYPASS=1` (не для production).

## Тесты

```powershell
npm test
npm run smoke:tz76
```

## Backup / restore (проверено)

```powershell
npm run db:backup
# restore:
powershell -File scripts/restore-postgres.ps1 -DumpFile .data\backups\workshop-YYYYMMDD-HHMMSS.dump
```

Проверка 2026-08-12: после `pg_dump` → вставка маркера → `pg_restore --clean` счётчики заказов/оплат/остатков/ledger совпали со snapshot, маркер исчез (`scripts/backup-verify-report.json`, `RESTORE_OK`).
