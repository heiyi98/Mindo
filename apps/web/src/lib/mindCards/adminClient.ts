import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createSupabaseMindCardsRepository } from '@mindo/db/supabase';

export const mindCardsAdminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// route文件自己的直接查询走这个repository。visibility.ts/favorites.ts/
// authors.ts/folderCover.ts/behaviorCandidates.ts这几个共享业务函数内部
// 多步查询耦合度高，继续直接持有 mindCardsAdminClient，不在这次拆分范围内。
export const mindCardsRepository = createSupabaseMindCardsRepository(mindCardsAdminClient);
