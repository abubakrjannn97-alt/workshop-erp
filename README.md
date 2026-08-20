# Workshop ERP / MRP

Универсальный MASTER производственного ERP. Модель: **MASTER → CLONE → CUSTOMIZE → DEPLOY** (отдельная БД на каждый clone, не multi-tenant).

Референс-домен по умолчанию — Facade (плитка / камень). Второй proof-clone — Bakery (`WORKSHOP_DOMAIN=bakery`).

Как создать новый domain clone: [`docs/clone.md`](docs/clone.md).

## UI

Светлая industrial-тема (Titan palette), компактный sidebar с иконками и collapse, RU/TJ.

Переключатель языка: в шапке и в боковой панели.

## Запуск

```powershell
cd E:\workshop-erp
.\scripts\start-postgres.ps1
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

PostgreSQL: `127.0.0.1:5433`. Скопируйте `.env.example` → `.env`.

Демо после seed (пароль всех: `ChangeMeNow!`):

| Роль | Email |
|------|-------|
| Владелец | `owner@workshop.local` |
| Директор | `director@workshop.local` |
| Продавец | `sales@workshop.local` |
| Нач. производства | `production@workshop.local` |
| Рабочий | `worker@workshop.local` |
| Кладовщик | `warehouse@workshop.local` |
| Бухгалтер | `accountant@workshop.local` |

На странице `/login` в dev-режиме — кнопки быстрого входа под каждую роль.

Для теста без логина: `AUTH_BYPASS=1` в `.env` (только локально, всегда owner).

## Production

Production login uses `OWNER_EMAIL` / `OWNER_PASSWORD` from the environment.

Do **not** use demo credentials (`ChangeMeNow!`, `owner@workshop.local` as a published password) on a live workshop database.

Production bootstrap:

```powershell
npx dotenv-cli -e .env.vercel -- node scripts/prod-db-setup.mjs
```

That script runs migrations and seeds **without** demo history (`SEED_DEMO=0`). `OWNER_PASSWORD` must be set and must not equal the demo default.

## Тесты

```powershell
npm test
npm run smoke:tz76
```

## Backup

```powershell
npm run db:backup
npm run db:restore
```
