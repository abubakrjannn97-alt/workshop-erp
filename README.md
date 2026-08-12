# Система автоматизации производственного цеха

Рабочая копия проекта: `E:\workshop-erp`

Техническое задание: `TZ.md`

Сейчас выполняется **PHASE 3 — Inventory** (ТЗ §77). PHASE 1–2 завершены.

## Запуск

```powershell
cd E:\workshop-erp
.\scripts\start-postgres.ps1
npx prisma migrate deploy
npm run db:seed
npm run dev
```

PostgreSQL слушает `127.0.0.1:5433`. Данные кластера: `E:\workshop-erp\.data\pgdata`.

Вход по умолчанию:

- email: `owner@workshop.local`
- пароль: `ChangeMeNow!`

PostgreSQL хранится на диске E: в `.data/postgres`.
