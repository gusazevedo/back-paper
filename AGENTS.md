# BackPaper

Android wallpaper-sharing app (React Native CLI, no Expo) backed by Supabase + Cloudflare R2. Product spec: `docs/SPEC.md`.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (gusazevedo/back-paper) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Development

- App (`app/`): `npm run android`, `npm start` (Metro), `npm run lint`, `npm run typecheck`, `npm test`.
- Backend (repo root): `npm run db:start` (needs Docker), `npm run db:reset` (reapplies `supabase/migrations` + `supabase/seed.sql`), `npm run db:test` (pgTAP tests in `supabase/tests`).
- Every migration that adds a table or policy gets pgTAP coverage in `supabase/tests` (RLS included).
- App config lives in `app/src/config/env.ts` (public values only: Supabase URL, anon key, Google Web client ID, storage public URL). Defaults point at the local stack on `127.0.0.1:54321`; on the emulator run `adb reverse tcp:54321 tcp:54321` (presigned upload URLs are signed for that host). Google provider secrets for the local stack go in `supabase/.env` (see `supabase/.env.example`).
- Edge Functions (`supabase/functions`, Deno): copy `supabase/functions/.env.example` to `.env` before `npm run db:start`. Locally the Supabase Storage S3 endpoint (bucket `wallpapers`) stands in for Cloudflare R2; object storage is only reached through `_shared/storage.ts`. Unit tests: `npm run fn:test`.
- Upload rules (R-PUB-3 to R-PUB-6) live twice and must stay in sync: `app/src/features/publish/imageRules.ts` (client, with specific messages) and `supabase/functions/_shared/uploads.ts` (server re-check). The 10-per-24h limit is enforced in SQL (`publish_quota`, `create_wallpaper` raises `BP429`).
- Deleting a wallpaper queues its object keys in `r2_deletion_queue` (trigger); pg_cron calls `run_r2_deletions()` every 5 minutes, which posts to the `process-r2-deletions` Edge Function with a shared secret. Per environment, set `R2_DELETIONS_SECRET` as a function secret and the same value in Vault (`select vault.create_secret('<secret>', 'r2_deletions_secret')`), plus `select vault.create_secret('https://<project>.supabase.co/functions/v1', 'functions_url')`. `supabase/seed.sql` sets the local values. A function added after `npm run db:start` is only served after a restart (or `npx supabase functions serve --env-file supabase/functions/.env`).
- Production R2 needs the `pending/` expiry rule once per bucket: `R2_BUCKET=<name> infra/r2/apply-lifecycle.sh` (the local Storage stand-in has no lifecycle rules).
- Debug builds without a Google client ID show a "Dev sign-in" button that signs in a local email/password user (`app/src/auth/devSignIn.ts`). Never ship it enabled.
- App tests mock Supabase with `app/testing/mockSupabase.ts` (auth, table queries, RPCs, functions).
- New migration: `npx supabase migration new <name> </dev/null` (the command reads SQL from stdin and hangs without the redirect).
- UI strings live in `app/src/i18n/en.ts` and are read with `t('key')`; never hardcode strings in screens.
- Android 17 emulator: a debug build needs the "nearby devices / local network" permission to reach Metro. Tap **Allow** on first launch.

## Design

- Source of truth for visuals: the claude-design artifact "BackPapers" (https://claude.ai/artifact/7VAk8wSbbg9bD9Xo9JViYv). Each screen is an artboard (`project/*.dc.html`); read the ones for the screen you are building.
- Translate artboards into React Native; never copy HTML. Use the tokens in `app/src/theme` (colors, typography, radii, spacing) and the base components in `app/src/components` instead of literal values.
- Navigation follows the design: floating pill (Feed, Profile) + "+" button that opens Publish as a full-screen modal.
