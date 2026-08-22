// packages/db 统一出口：只导出接口定义/类型契约，不含任何具体数据库实现。
// 具体的Supabase实现从 '@mindo/db/supabase' 单独导入。

export * from './payments/interface';
export * from './account/interface';
export * from './bazi/interface';
export * from './bigfive/interface';
export * from './mindCards/interface';
export * from './western/interface';
export * from './social/interface';
export * from './codex/interface';
export * from './admin/interface';

export interface ProfileInsert {
  user_id: string;
  display_name: string;
  birth_date: string;        // ISO格式 "YYYY-MM-DD"
  birth_time: string | null; // "HH:MM" 或 null
  birth_lat: number | null;
  birth_lng: number | null;
  birth_place_name: string | null;
  is_self: boolean;
}

export interface StemContent {
  stem_id: string;
  content_type: string;
  locale: string;
  content: Record<string, unknown>;
}

export interface Celebrity {
  id: string;
  name: string;
  portrait_url: string | null;
  display_order: number;
}
