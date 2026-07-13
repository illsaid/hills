-- Cleanup: unschedule pg_cron jobs inherited from the old (bolt-owned) project.
-- These POST to the dead hzlzhedaewsyvtckgqji project URL with its old anon key.
-- GitHub Actions is the single scheduler now (see .github/workflows/).
-- Run in: Supabase Dashboard -> SQL Editor. Safe to run repeatedly.

DO $$
DECLARE
  job_name text;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'lafd-alerts-hourly',
    'safety-dispatch-hourly',
    'social-sentinel-hourly',
    'news-sentinel-hourly',
    'weather-sync-hourly',
    'code-enforcement-daily',
    'fbns-daily'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = job_name) THEN
      PERFORM cron.unschedule(job_name);
      RAISE NOTICE 'Unscheduled: %', job_name;
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'pg_cron not enabled on this project - nothing to clean up.';
END $$;

-- Verify: should return zero rows
SELECT jobname, schedule FROM cron.job;
