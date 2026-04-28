// packages/db 统一出口
// 具体客户端在 apps/web 层创建，这里导出类型契约

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
