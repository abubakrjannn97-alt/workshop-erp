# Workshop ERP / MRP

Система автоматизации производственного цеха (плитка / камень) по `TZ.md`.

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

Демо после seed:

- email: `owner@workshop.local`
- password: `ChangeMeNow!`

Для теста без логина: `AUTH_BYPASS=1` в `.env` (только локально).

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
