# Decommissioning and backup

This repository is public, so the shutdown process separates `GitHub-safe backup artifacts` from `local-only backup files`.

## Backup policy

- Commit `schema + public application data` to GitHub.
- Keep the broader local backup file on the operator machine only.
- Never commit `.env.local`, service role keys, admin tokens, or other secrets.

The current production audit found:

- Public app tables: `public.facilities`, `public.schedules`, `public.facility_schedules`
- `auth.users`: empty
- `storage.buckets`: empty

## Export command

Run the export from the repository root:

```bash
pnpm --filter scripts export-supabase-backup
```

This writes:

- `supabase/seed.sql`
  - Tracked file for restoring the public application data into a fresh Supabase project.
- `apps/scripts/logs/supabase-backup-*.json`
  - Gitignored local backup snapshot, including the exported table rows and audit metadata.
- `apps/scripts/logs/supabase-audit-*.json`
  - Gitignored audit summary for the shutdown record.

You can override the output paths:

```bash
pnpm --filter scripts export-supabase-backup --seed-file=./supabase/seed.sql --backup-file=./apps/scripts/logs/custom-backup.json --audit-file=./apps/scripts/logs/custom-audit.json
```

If you only want the local JSON backup without updating `supabase/seed.sql`:

```bash
pnpm --filter scripts export-supabase-backup --skip-seed
```

## Restore flow

The repository already contains migrations in `supabase/migrations/`.

To restore locally:

1. Start a local Supabase environment.
2. Apply the migrations.
3. Load `supabase/seed.sql`.

Because `supabase/config.toml` points to `supabase/seed.sql`, the seed file can be used with standard Supabase local reset flows.

## Shutdown checklist

1. Run `pnpm --filter scripts export-supabase-backup`.
2. Inspect the generated `apps/scripts/logs/supabase-audit-*.json`.
3. Review `git diff -- supabase/seed.sql docs/decommissioning.md README.md docs/README.md`.
4. Commit the repository-safe artifacts.
5. Verify the local JSON backup exists outside Git tracking.
6. Remove the Vercel project from the dashboard.
7. Delete or pause the Supabase project from the dashboard.
8. Rotate or discard related secrets:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_API_TOKEN`
   - `ADMIN_BASIC_AUTH_USER`
   - `ADMIN_BASIC_AUTH_PASSWORD`

## Limitations

- The local JSON backup is designed around the application data used by this project. If the Supabase project later gains storage objects, auth users, or unmanaged schemas, audit those resources again before deleting the hosted project.
