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
- App config lives in `app/src/config/env.ts` (public values only: Supabase URL, anon key, Google Web client ID). Defaults point at the local stack (`10.0.2.2:54321` from the emulator). Google provider secrets for the local stack go in `supabase/.env` (see `supabase/.env.example`).
- New migration: `npx supabase migration new <name> </dev/null` (the command reads SQL from stdin and hangs without the redirect).
- UI strings live in `app/src/i18n/en.ts` and are read with `t('key')`; never hardcode strings in screens.
- Android 17 emulator: a debug build needs the "nearby devices / local network" permission to reach Metro. Tap **Allow** on first launch.

## Design

- Source of truth for visuals: the claude-design artifact "BackPapers" (https://claude.ai/artifact/7VAk8wSbbg9bD9Xo9JViYv). Each screen is an artboard (`project/*.dc.html`); read the ones for the screen you are building.
- Translate artboards into React Native; never copy HTML. Use the tokens in `app/src/theme` (colors, typography, radii, spacing) and the base components in `app/src/components` instead of literal values.
- Navigation follows the design: floating pill (Feed, Profile) + "+" button that opens Publish as a full-screen modal.
