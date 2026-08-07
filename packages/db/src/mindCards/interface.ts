// 片语模块的数据操作契约，覆盖21个route文件各自的直接查询。
// 5个共享业务函数（visibility.ts/favorites.ts/authors.ts/folderCover.ts/
// behaviorCandidates.ts）内部结构已经良好（多步查询强耦合、拆分收益低），
// 继续持有 mindCardsAdminClient 不变，不在这次拆分范围内。

import type { DbError } from '../shared/types';
export type { DbError };

export interface MindCardRow {
  id: string;
  user_id: string;
  content: string;
  visibility: string;
  style: unknown;
  created_at: string;
}

export interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  folder_kind: string;
  display_mode: string | null;
  visibility: string;
  is_default: boolean;
  order_index?: number;
  created_at?: string;
}

export interface CommentRow {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  reply_to_comment_id?: string | null;
}

export interface NotificationRow {
  id: string;
  type: string;
  created_at: string;
  read_at: string | null;
  actor_id: string;
  card_id: string;
  comment_id: string | null;
  target_comment_id: string | null;
  folder_id: string | null;
}

export interface MindCardsUserLite {
  id: string;
  handle: string;
  display_name: string | null;
}

export interface FolderItemRow {
  folder_id: string;
  card_id: string;
  added_at: string;
}

export interface InsertNotificationInput {
  recipient_id: string;
  actor_id: string;
  card_id: string;
  type: string;
  comment_id?: string;
  target_comment_id?: string;
  folder_id?: string;
}

export interface MindCardsRepository {
  // users
  getUserHandle(userId: string): Promise<MindCardsUserLite | null>;

  // mind_cards
  getCard(cardId: string): Promise<MindCardRow | null>;
  listCardsByAuthor(userId: string): Promise<MindCardRow[]>;
  listCardsByIds(ids: string[]): Promise<MindCardRow[]>;
  listCardsByAuthors(authorIds: string[], cursor: string | null, limit: number): Promise<MindCardRow[]>;
  listRecentCardsExcludingUser(windowStartIso: string, userId: string): Promise<MindCardRow[]>;
  insertCard(input: { user_id: string; content: string; visibility: string; style: unknown }): Promise<{ data: MindCardRow | null; error: DbError | null }>;
  updateCardVisibility(cardId: string, visibility: string): Promise<{ data: MindCardRow | null; error: DbError | null }>;
  deleteCard(cardId: string): Promise<void>;

  // mind_card_metrics / views / recommendation_sources
  getViewedCardIds(viewerId: string, cardIds: string[]): Promise<Set<string>>;
  markCardViewed(cardId: string, viewerId: string): Promise<{ error: DbError | null }>;
  getCardMetrics(cardIds: string[]): Promise<{ card_id: string; metric_type: string; metric_data: unknown }[]>;
  insertCardMetrics(rows: { card_id: string; metric_type: string; metric_data: Record<string, number> }[]): Promise<void>;
  insertRecommendationSources(rows: { viewer_id: string; card_id: string; source: string }[]): Promise<void>;

  // mind_card_folders
  getFolderDetail(folderId: string): Promise<FolderRow | null>;
  getFoldersByIds(ids: string[]): Promise<FolderRow[]>;
  getFolderOwnership(folderId: string): Promise<{ id: string; user_id: string; is_default: boolean } | null>;
  listOwnFoldersOrdered(userId: string): Promise<FolderRow[]>;
  listFoldersByOwner(userId: string): Promise<FolderRow[]>;
  countOwnFolders(userId: string): Promise<number>;
  insertFolder(input: {
    user_id: string; name: string; description: string | null; folder_kind: string;
    display_mode: string | null; visibility: string; order_index: number;
  }): Promise<{ data: FolderRow | null; error: DbError | null }>;
  updateFolder(folderId: string, updates: Record<string, unknown>): Promise<{ data: FolderRow | null; error: DbError | null }>;
  deleteFolder(folderId: string): Promise<{ error: DbError | null }>;

  // mind_card_folder_items
  getFolderItemsWithCards(folderId: string): Promise<{ added_at: string; annotation: string | null; card: { id: string; user_id: string; visibility: string } | null }[]>;
  countFolderItem(folderId: string, cardId: string): Promise<number>;
  insertFolderItem(folderId: string, cardId: string, annotation: string | null): Promise<{ error: DbError | null }>;
  updateFolderItemAnnotation(folderId: string, cardId: string, annotation: string | null): Promise<{ error: DbError | null }>;
  deleteFolderItem(folderId: string, cardId: string): Promise<{ error: DbError | null }>;
  getFolderItemsForCard(cardId: string, folderIds: string[]): Promise<Set<string>>;

  // mind_card_folder_subscriptions
  listFolderSubscriptions(subscriberId: string): Promise<{ created_at: string; folder: FolderRow | null }[]>;
  insertFolderSubscription(folderId: string, subscriberId: string): Promise<{ error: DbError | null }>;
  deleteFolderSubscription(folderId: string, subscriberId: string): Promise<{ error: DbError | null }>;

  // mind_card_comments
  countComments(cardId: string): Promise<number>;
  listTopLevelComments(cardId: string): Promise<CommentRow[]>;
  listReplyCountsByParents(parentIds: string[]): Promise<Map<string, number>>;
  getCommentById(commentId: string): Promise<CommentRow & { card_id: string } | null>;
  listReplies(parentCommentId: string): Promise<CommentRow[]>;
  getCommentsByIds(ids: string[]): Promise<Map<string, CommentRow>>;
  insertComment(input: {
    card_id: string; author_id: string; parent_comment_id: string | null;
    reply_to_comment_id: string | null; content: string;
  }): Promise<{ data: { id: string; content: string; created_at: string } | null; error: DbError | null }>;
  deleteComment(commentId: string): Promise<{ error: DbError | null }>;

  // mind_card_notifications
  listNotifications(recipientId: string, limit: number): Promise<NotificationRow[]>;
  countUnreadNotifications(recipientId: string): Promise<number>;
  insertNotification(input: InsertNotificationInput): Promise<{ error: DbError | null }>;
  markAllNotificationsRead(recipientId: string): Promise<{ error: DbError | null }>;
  getCardStylesByIds(ids: string[]): Promise<Map<string, unknown>>;

  // cron清理专用
  listStaleCardIds(windowStartIso: string): Promise<string[]>;
  deleteViewsForCards(cardIds: string[]): Promise<{ count: number; error: DbError | null }>;

  // 附着命理/心理数据快照专用（root POST发布卡片时）
  getSelfProfileId(userId: string): Promise<string | null>;
  getBaziCalculationResult(profileId: string): Promise<unknown | null>;
  getBigfiveDomainScores(profileId: string, userId: string): Promise<Record<string, number> | null>;
}
