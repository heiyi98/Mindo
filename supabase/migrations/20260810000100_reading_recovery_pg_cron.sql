-- reading-recovery定时任务的实际触发源：Vercel Hobby套餐的cron只支持一天一次，
-- 做不到这里需要的2分钟一次，改用Supabase自带的pg_cron，每2分钟对Vercel上的
-- /api/cron/reading-recovery发一次HTTP POST。
--
-- CRON_SECRET不出现在这个文件里——提前用vault.create_secret()存进了Supabase Vault
-- （密钥名bazi_reading_recovery_cron_secret），这里只按名字引用。

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'bazi-reading-recovery',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mindo-web.vercel.app/api/cron/reading-recovery',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'bazi_reading_recovery_cron_secret'
      ),
      'Content-Type', 'application/json'
    )
  );
  $$
);
