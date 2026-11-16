#!/usr/bin/env bash
# Safety net for abandoned uploads (§6.1): objects under pending/ expire after 1 day.
# publish-wallpaper already deletes pending/ on success and on failure; this catches
# uploads the app never finished (closed mid-upload, network loss).
#
# Usage: R2_BUCKET=<bucket> infra/r2/apply-lifecycle.sh
# Needs Cloudflare credentials: `npx wrangler login` or CLOUDFLARE_API_TOKEN (R2 edit).
# Idempotent: re-running replaces the rule with the same id.
set -euo pipefail

: "${R2_BUCKET:?Set R2_BUCKET to the production bucket name}"
WRANGLER="npx --yes wrangler@4"

$WRANGLER r2 bucket lifecycle remove "$R2_BUCKET" --name expire-pending >/dev/null 2>&1 || true
$WRANGLER r2 bucket lifecycle add "$R2_BUCKET" expire-pending pending/ --expire-days 1 --force
$WRANGLER r2 bucket lifecycle list "$R2_BUCKET"
