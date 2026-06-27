import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Vercel Cron Job - 每5分钟扫描卡住的报告任务
export async function GET(request: Request) {
  // 验证是Vercel的cron调用
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // 找出所有卡住的任务（状态为failed_*，或者5分钟前开始生成但没完成）
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: stuckJobs } = await supabase
    .from('bazi_snapshots')
    .select('id, ai_reading_status, ai_reading_draft, ai_reading_theme1, ai_reading_theme2, ai_reading_theme3, ai_reading_theme4, updated_at')
    .or('ai_reading_status.like.failed_%,and(ai_reading_status.neq.done,ai_reading_status.not.is.null,updated_at.lt.' + fiveMinutesAgo + ')')
    .is('ai_reading_theme4', null)
    .limit(10);

  if (!stuckJobs || stuckJobs.length === 0) {
    return NextResponse.json({ message: '无卡住任务' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const results = await Promise.allSettled(
    stuckJobs.map(async (job) => {
      // 根据已完成的阶段决定从哪里继续
      let targetFunction = 'generate-phase1';
      if (job.ai_reading_theme3) targetFunction = 'generate-theme4';
      else if (job.ai_reading_theme2) targetFunction = 'generate-theme3';
      else if (job.ai_reading_theme1) targetFunction = 'generate-theme2';
      else if (job.ai_reading_draft) targetFunction = 'generate-theme1';

      console.log(`[Cron] 重新触发 ${job.id}，从 ${targetFunction} 继续`);

      await fetch(`${supabaseUrl}/functions/v1/${targetFunction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ snapshotId: job.id }),
      });

      return job.id;
    })
  );

  const recovered = results.filter(r => r.status === 'fulfilled').length;
  console.log(`[Cron] 恢复了 ${recovered}/${stuckJobs.length} 个任务`);

  return NextResponse.json({ recovered, total: stuckJobs.length });
}
