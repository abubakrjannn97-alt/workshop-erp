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

## Production (Vercel)

**Ссылка:** https://workshop-erp-zeta.vercel.app/login

> Не используйте `workshop-erp.vercel.app` — это чужой шаблон, не наш проект.

Вход:

- Email: `owner@workshop.local`
- Пароль: `ChangeMeNow!`

Повторный seed production БД:

```powershell
npx dotenv-cli -e .env.vercel -- node scripts/prod-db-setup.mjs
```

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
