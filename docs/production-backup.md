# Production Backup & Recovery

## 1) Configuration

Required env variables:

- `DATABASE_URL` — primary production DB URL
- `BACKUP_DATABASE_URL` — optional dedicated URL for backup user
- `BACKUP_DIR` — local backup directory (default `.data/backups`)
- `BACKUP_RETENTION_DAYS` — retention window (default `14`)
- `BACKUP_OFFSITE_CMD` — off-site copy command (optional), supports:
  - `{FILE}` full path
  - `{FILENAME}` dump filename

Optional restore verification env:

- `RESTORE_DATABASE_URL` — non-production clone DB for restore checks

## 2) Daily backup

Run:

```bash
npm run db:backup
```

Script behavior:

1. Connects to PostgreSQL using `BACKUP_DATABASE_URL` (or `DATABASE_URL` fallback)
2. Creates `.dump` via `pg_dump`
3. Validates file exists and is not empty
4. Writes result to `.data/backups/journal.jsonl`
5. Purges files older than `BACKUP_RETENTION_DAYS`
6. Optionally copies dump off-site via `BACKUP_OFFSITE_CMD`

Returns non-zero exit code on failure.

## 3) Off-site storage

Backups must be copied outside the DB host.

Example:

```bash
BACKUP_OFFSITE_CMD="aws s3 cp {FILE} s3://workshop-backups/{FILENAME}"
```

Use your provider equivalent (S3/GCS/Azure/NAS/rsync).

## 4) Failure handling

If backup fails:

1. Exit code is non-zero
2. Failure is recorded in backup journal
3. Operator must investigate DB connectivity / credentials / disk
4. Do not proceed with deployment until backup succeeds

## 5) Manual backup

```bash
npm run db:backup
```

Then verify:

- file exists
- file size > 0
- journal entry has `ok: true`

## 6) Restore verification (safe workflow)

Never restore directly into production for verification.

Use clone DB:

```bash
RESTORE_DATABASE_URL=postgresql://.../workshop_verify npm run db:restore:verify -- .data/backups/workshop-<stamp>.dump
```

The script verifies:

- connectivity
- required schema tables
- key entities counts (users/roles/customers/orders/items/production/materials/stock/payments/ledger/audit)
- prisma migrations table

## 7) Recovery procedure

1. Identify latest valid off-site backup
2. Restore to clone DB and run verification
3. If verification passes, execute controlled production restore window
4. Run post-restore smoke (`npm run smoke:http`) and health probe (`/api/health`)
5. Confirm business-critical pages/actions

