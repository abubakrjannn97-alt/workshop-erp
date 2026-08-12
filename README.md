# Workshop ERP / MRP

Система автоматизации производственного цеха (плитка / камень) по `TZ.md`.

Рабочая копия: `E:\workshop-erp`

## Что внутри (по фазам ТЗ §77)

- PHASE 1–8: foundation, продукция/рецептуры, склад/закупки, CRM/заказы, производство, финансы, payroll, approvals
- PHASE 9: отчёты и KPI — раздел **Аналитика** (`/analytics`) + сводка на главной
- PHASE 10: PWA (`public/manifest.webmanifest`, `public/sw.js`), mobile nav, печать, backup-скрипты, unit-тесты

## Отчёты

Откройте в приложении:

1. **Аналитика** — `/analytics` (продажи, долги, маржа/фонды, брак, покрытие сырья)
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

## Тесты

```powershell
npm test
```
