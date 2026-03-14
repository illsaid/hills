/*
  # Enable pg_cron and pg_net Extensions

  ## Summary
  Enables two Postgres extensions required for scheduled Edge Function invocations:
  
  1. **pg_cron** - Allows scheduling SQL jobs on a cron schedule directly in Postgres.
     Installed in the `cron` schema (Supabase standard).
  
  2. **pg_net** - Allows making async HTTP requests from within Postgres functions/triggers.
     Used by pg_cron jobs to POST to Supabase Edge Function URLs.

  ## Notes
  - These extensions are pre-installed on Supabase infrastructure but must be explicitly enabled.
  - pg_cron jobs are visible in the `cron.job` table.
  - pg_net async requests are visible in the `net._http_response` table.
*/

create extension if not exists pg_cron with schema cron;
create extension if not exists pg_net with schema extensions;
