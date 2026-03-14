/*
  # Fix cron job authorization

  ## Summary
  Updates all 8 pg_cron jobs to use the Supabase anon key for authorization
  instead of app.settings.service_role_key.

  Since all Edge Functions are deployed with verify_jwt=false, the anon key
  is sufficient to invoke them. Supabase always makes the anon key available
  via app.settings.anon_key within the database.

  ## Changes
  - Reschedules all 8 cron jobs with correct Authorization header using anon key
*/

select cron.unschedule('lafd-alerts-hourly');
select cron.unschedule('safety-dispatch-hourly');
select cron.unschedule('social-sentinel-hourly');
select cron.unschedule('news-sentinel-hourly');
select cron.unschedule('weather-sync-hourly');
select cron.unschedule('environmental-sync-6h');
select cron.unschedule('code-enforcement-daily');
select cron.unschedule('fbns-daily');

select cron.schedule(
  'lafd-alerts-hourly',
  '0 * * * *',
  $$select net.http_post(
    url:='https://hzlzhedaewsyvtckgqji.supabase.co/functions/v1/lafd-alerts',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bHpoZWRhZXdzeXZ0Y2tncWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzkyNTEsImV4cCI6MjA4NDE1NTI1MX0.XESRTgAuiYMWYUkOWXtleSajhJ8l56z7AlQT4u55z3c"}'::jsonb,
    body:='{}'::jsonb
  );$$
);

select cron.schedule(
  'safety-dispatch-hourly',
  '5 * * * *',
  $$select net.http_post(
    url:='https://hzlzhedaewsyvtckgqji.supabase.co/functions/v1/safety-dispatch',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bHpoZWRhZXdzeXZ0Y2tncWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzkyNTEsImV4cCI6MjA4NDE1NTI1MX0.XESRTgAuiYMWYUkOWXtleSajhJ8l56z7AlQT4u55z3c"}'::jsonb,
    body:='{}'::jsonb
  );$$
);

select cron.schedule(
  'social-sentinel-hourly',
  '10 * * * *',
  $$select net.http_post(
    url:='https://hzlzhedaewsyvtckgqji.supabase.co/functions/v1/social-sentinel',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bHpoZWRhZXdzeXZ0Y2tncWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzkyNTEsImV4cCI6MjA4NDE1NTI1MX0.XESRTgAuiYMWYUkOWXtleSajhJ8l56z7AlQT4u55z3c"}'::jsonb,
    body:='{}'::jsonb
  );$$
);

select cron.schedule(
  'news-sentinel-hourly',
  '15 * * * *',
  $$select net.http_post(
    url:='https://hzlzhedaewsyvtckgqji.supabase.co/functions/v1/news-sentinel',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bHpoZWRhZXdzeXZ0Y2tncWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzkyNTEsImV4cCI6MjA4NDE1NTI1MX0.XESRTgAuiYMWYUkOWXtleSajhJ8l56z7AlQT4u55z3c"}'::jsonb,
    body:='{}'::jsonb
  );$$
);

select cron.schedule(
  'weather-sync-hourly',
  '20 * * * *',
  $$select net.http_post(
    url:='https://hzlzhedaewsyvtckgqji.supabase.co/functions/v1/weather-sync',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bHpoZWRhZXdzeXZ0Y2tncWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzkyNTEsImV4cCI6MjA4NDE1NTI1MX0.XESRTgAuiYMWYUkOWXtleSajhJ8l56z7AlQT4u55z3c"}'::jsonb,
    body:='{}'::jsonb
  );$$
);

select cron.schedule(
  'environmental-sync-6h',
  '25 */6 * * *',
  $$select net.http_post(
    url:='https://hzlzhedaewsyvtckgqji.supabase.co/functions/v1/environmental-sync',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bHpoZWRhZXdzeXZ0Y2tncWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzkyNTEsImV4cCI6MjA4NDE1NTI1MX0.XESRTgAuiYMWYUkOWXtleSajhJ8l56z7AlQT4u55z3c"}'::jsonb,
    body:='{}'::jsonb
  );$$
);

select cron.schedule(
  'code-enforcement-daily',
  '30 2 * * *',
  $$select net.http_post(
    url:='https://hzlzhedaewsyvtckgqji.supabase.co/functions/v1/fetch-code-enforcement',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bHpoZWRhZXdzeXZ0Y2tncWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzkyNTEsImV4cCI6MjA4NDE1NTI1MX0.XESRTgAuiYMWYUkOWXtleSajhJ8l56z7AlQT4u55z3c"}'::jsonb,
    body:='{}'::jsonb
  );$$
);

select cron.schedule(
  'fbns-daily',
  '0 1 * * *',
  $$select net.http_post(
    url:='https://hzlzhedaewsyvtckgqji.supabase.co/functions/v1/fetch-la-fbns',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bHpoZWRhZXdzeXZ0Y2tncWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NzkyNTEsImV4cCI6MjA4NDE1NTI1MX0.XESRTgAuiYMWYUkOWXtleSajhJ8l56z7AlQT4u55z3c"}'::jsonb,
    body:='{}'::jsonb
  );$$
);
