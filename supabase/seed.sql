-- Local only: lets pg_cron reach the Edge Functions (see the r2 deletion migration).
-- The secret matches R2_DELETIONS_SECRET in supabase/functions/.env.example.
select vault.create_secret('http://host.docker.internal:54321/functions/v1', 'functions_url');
select vault.create_secret('local-r2-deletions-secret', 'r2_deletions_secret');
