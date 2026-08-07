import type { DbError } from '../payments/interface';
export type { DbError };

export interface UserLite {
  id: string;
  handle: string | null;
  display_name: string | null;
}

export interface ConversationParticipation {
  conversation_id: string;
  last_read_at: string | null;
}

export interface MessageRow {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface CelebrityRow {
  id: string;
  name: string;
  portrait_url: string | null;
  display_order: number;
}

/**
 * 跨模块共用、但没有大到需要单独一个模块文档的这些边角：用户资料/搜索、
 * 关注关系、私信会话、名人库、天干内容库。follows表虽然片语模块也用，
 * 但它是全项目共用的关注关系表（见Mindo-数据库.md），不专属于片语。
 */
export interface SocialRepository {
  // users
  getUserByHandle(handle: string): Promise<UserLite | null>;
  updateUserProfile(userId: string, updates: { display_name?: string; handle?: string }): Promise<{ error: DbError | null }>;
  isHandleTaken(handle: string, excludeUserId: string): Promise<boolean>;
  searchUsers(query: string, excludeUserId: string | null): Promise<UserLite[]>;

  // follows
  listFollowing(userId: string): Promise<UserLite[]>;
  listFollowers(userId: string): Promise<UserLite[]>;
  listMyFollowingIds(userId: string, targetIds: string[]): Promise<Set<string>>;
  getFollowEdge(followerId: string, followingId: string): Promise<boolean>;
  follow(followerId: string, followingId: string): Promise<{ error: DbError | null }>;
  unfollow(followerId: string, followingId: string): Promise<{ error: DbError | null }>;

  // conversations / messages
  listMyParticipations(userId: string): Promise<ConversationParticipation[]>;
  listOtherParticipants(conversationIds: string[], excludeUserId: string): Promise<Map<string, UserLite>>;
  listLastMessages(conversationIds: string[]): Promise<Map<string, { content: string; created_at: string }>>;
  findExistingConversationId(myConversationIds: string[], targetUserId: string): Promise<string | null>;
  createConversation(): Promise<{ data: { id: string } | null; error: DbError | null }>;
  addParticipants(conversationId: string, userIds: string[]): Promise<{ error: DbError | null }>;
  getParticipation(conversationId: string, userId: string): Promise<boolean>;
  listMessages(conversationId: string): Promise<MessageRow[]>;
  touchLastRead(conversationId: string, userId: string): Promise<void>;
  insertMessage(conversationId: string, senderId: string, content: string): Promise<{ data: MessageRow | null; error: DbError | null }>;

  // 名人库 / 天干内容库
  listCelebrities(stemId: string): Promise<CelebrityRow[]>;
  getStemContent(stemId: string, locale: string, contentType: string): Promise<Record<string, unknown> | null>;
}
