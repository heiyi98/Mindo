// Supabase具体实现的统一出口。以后新增数据库实现（比如中国版阿里云数据库）
// 时，各自建一个平级文件（比如 aliyun/index.ts），不要往这个文件里塞判断逻辑。

export { createSupabasePaymentsRepository } from '../payments/supabaseRepository';
export { createSupabaseAccountRepository } from '../account/supabaseRepository';
export { createSupabaseBaziRepository } from '../bazi/supabaseRepository';
export { createSupabaseBigfiveRepository } from '../bigfive/supabaseRepository';
export { createSupabaseMindCardsRepository } from '../mindCards/supabaseRepository';
export { createSupabaseWesternRepository } from '../western/supabaseRepository';
export { createSupabaseSocialRepository } from '../social/supabaseRepository';
