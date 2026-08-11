-- 修复2026-08-10迁移里写死的生产域名：Vercel项目被删除重建过，生产别名从
-- mindo-web.vercel.app 变成了 mindo-gold.vercel.app，导致这个cron从上线起
-- 每2分钟发一次请求，但每次都被Vercel按DEPLOYMENT_NOT_FOUND拒绝（404），
-- reading-recovery从未真正跑起来过。
--
-- 顺带修另一个从上线起就存在、从未被真实流量触发过所以没暴露的bug：这里原来用
-- net.http_post发请求，但/api/cron/reading-recovery/route.ts只导出了GET
-- handler，方法对不上会被Next.js返回405——即使域名是对的也一样跑不通，
-- 改用net.http_get。

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'bazi-reading-recovery'),
  command := $$
  SELECT net.http_get(
    url := 'https://mindo-gold.vercel.app/api/cron/reading-recovery',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'bazi_reading_recovery_cron_secret'
      )
    )
  );
  $$
);
