'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams, useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Send, Search, X } from 'lucide-react';

interface OtherUser {
  id: string;
  display_name: string | null;
  handle: string | null;
}

interface Conversation {
  id: string;
  other: OtherUser;
  lastMessage: { content: string; created_at: string } | null;
}

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface SearchUser {
  id: string;
  handle: string | null;
  display_name: string | null;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
}

export default function MessagesPage() {
  const t = useTranslations('social');
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const convFromUrl = searchParams.get('conv');

  const [myId, setMyId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const activeIdRef = useRef<string | null>(null);
  const myIdRef = useRef<string | null>(null);
  const autoOpenedRef = useRef(false);
  const supabaseRef = useRef(createClient());

  const activeConv = conversations.find(c => c.id === activeId) ?? null;
  const isSearching = searchQuery.trim().length > 0;

  const openConversation = async (convId: string) => {
    if (activeIdRef.current === convId) return;
    activeIdRef.current = convId;
    setActiveId(convId);
    setMessages([]);
    setLoadingMsgs(true);

    if (channelRef.current) {
      await supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const res = await fetch(`/api/conversations/${convId}/messages`);
    const { messages: msgs, myId: id } = await res.json();
    if (id) {
      myIdRef.current = id;
      setMyId(id);
    }
    setMessages(msgs ?? []);
    setLoadingMsgs(false);

    const channel = supabaseRef.current
      .channel(`conv-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload: any) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setConversations(prev =>
            prev
              .map(c =>
                c.id === convId
                  ? { ...c, lastMessage: { content: newMsg.content, created_at: newMsg.created_at } }
                  : c
              )
              .sort((a, b) => {
                const ta = a.lastMessage?.created_at ?? '';
                const tb = b.lastMessage?.created_at ?? '';
                return tb.localeCompare(ta);
              })
          );
        }
      );

    channel.subscribe();
    channelRef.current = channel;
  };

  // 点击搜索结果用户，创建或打开会话
  const handleStartConversation = async (targetUser: SearchUser) => {
    setSearchQuery('');
    setSearchResults([]);

    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: targetUser.id }),
    });

    if (!res.ok) return;
    const { conversationId } = await res.json();

    // 如果会话不在列表里，手动加入
    setConversations(prev => {
      if (prev.find(c => c.id === conversationId)) return prev;
      return [
        {
          id: conversationId,
          other: {
            id: targetUser.id,
            display_name: targetUser.display_name,
            handle: targetUser.handle,
          },
          lastMessage: null,
        },
        ...prev,
      ];
    });

    openConversation(conversationId);
  };

  // 搜索防抖
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const { users } = await res.json();
        setSearchResults(users ?? []);
      }
      setSearching(false);
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        myIdRef.current = user.id;
        setMyId(user.id);
      }
    });

    fetch('/api/conversations')
      .then(r => r.json())
      .then(({ conversations: convs }) => {
        const list: Conversation[] = convs ?? [];
        setConversations(list);
        setLoadingConvs(false);

        if (convFromUrl && !autoOpenedRef.current) {
          autoOpenedRef.current = true;
          openConversation(convFromUrl);
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!activeIdRef.current || !input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    await fetch(`/api/conversations/${activeIdRef.current}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGoToProfile = () => {
    if (activeConv?.other.handle) {
      router.push(`/${locale}/u/${activeConv.other.handle}`);
    }
  };

  const height = 'calc(100vh - 48px - 48px - 48px)';

  return (
    <div
      className="flex rounded-2xl overflow-hidden"
      style={{
        height,
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
      }}
    >
      {/* 左栏：搜索 + 会话列表 */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{ width: 260, borderRight: '1px solid hsl(var(--border))' }}
      >
        {/* 标题 */}
        <div
          className="px-4 pt-4 pb-3 text-xs font-light tracking-widest uppercase flex-shrink-0"
          style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
        >
          {t('messagesTitle')}
        </div>

        {/* 搜索框 */}
        <div className="px-3 pb-3 flex-shrink-0">
          <div className="relative flex items-center">
            <Search
              size={13}
              className="absolute left-3 pointer-events-none"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-8 py-2 rounded-xl text-xs font-light focus:outline-none"
              style={{
                background: 'hsl(var(--muted))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-3"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 列表区域 */}
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            // 搜索结果
            searching ? (
              <div className="px-4 py-3 text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
                ...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3 text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('searchNoResults')}
              </div>
            ) : (
              <>
                <div
                  className="px-4 py-2 text-xs font-light"
                  style={{ color: 'hsl(var(--muted-foreground) / 0.5)' }}
                >
                  {t('searchResults')}
                </div>
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleStartConversation(u)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-light flex-shrink-0"
                      style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                    >
                      {u.display_name?.[0]?.toUpperCase() ?? u.handle?.[6]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-light truncate" style={{ color: 'hsl(var(--foreground))' }}>
                        {u.display_name ?? t('noName')}
                      </p>
                      <p className="text-xs font-light truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        @{u.handle}
                      </p>
                    </div>
                  </button>
                ))}
              </>
            )
          ) : (
            // 会话列表
            loadingConvs ? (
              <div className="px-4 py-6 text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
                ...
              </div>
            ) : conversations.length === 0 && !activeId ? (
              <div className="px-4 py-6 text-xs font-light leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>
                {t('noConversations')}
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className="w-full flex flex-col gap-0.5 px-4 py-3 text-left transition-colors"
                  style={{
                    background: activeId === conv.id ? 'hsl(var(--muted) / 0.6)' : 'transparent',
                    borderLeft: activeId === conv.id ? '2px solid hsl(var(--foreground))' : '2px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-light truncate" style={{ color: 'hsl(var(--foreground))' }}>
                      {conv.other.display_name ?? t('noName')}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-xs font-light flex-shrink-0" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <span className="text-xs font-light truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      {conv.lastMessage.content}
                    </span>
                  )}
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* 右栏：聊天区 */}
      <div className="flex flex-col flex-1 min-w-0">
        {activeId ? (
          <>
            {/* 聊天头部 */}
            <div
              className="flex items-center px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid hsl(var(--border))' }}
            >
              <button
                onClick={handleGoToProfile}
                disabled={!activeConv?.other.handle}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-light flex-shrink-0 mr-3 transition-opacity hover:opacity-70 disabled:cursor-default"
                style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
              >
                {activeConv?.other.display_name?.[0]?.toUpperCase() ?? '?'}
              </button>
              <button
                onClick={handleGoToProfile}
                disabled={!activeConv?.other.handle}
                className="text-sm font-light transition-opacity hover:opacity-70 disabled:cursor-default"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                {activeConv?.other.display_name ?? t('noName')}
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="text-xs font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  ...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-xs font-light text-center mt-8" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {t('startConversation')}
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map(msg => {
                    const isMe = msg.sender_id === myId;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <button
                            onClick={handleGoToProfile}
                            disabled={!activeConv?.other.handle}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-light flex-shrink-0 mr-2 self-end mb-4 transition-opacity hover:opacity-70 disabled:cursor-default"
                            style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                          >
                            {activeConv?.other.display_name?.[0]?.toUpperCase() ?? '?'}
                          </button>
                        )}
                        <div className="flex flex-col gap-0.5 max-w-[65%]">
                          <div
                            className="px-3 py-2 rounded-2xl text-sm font-light leading-relaxed"
                            style={isMe
                              ? {
                                  background: 'hsl(var(--foreground))',
                                  color: 'hsl(var(--background))',
                                  borderBottomRightRadius: 6,
                                }
                              : {
                                  background: 'hsl(var(--muted))',
                                  color: 'hsl(var(--foreground))',
                                  borderBottomLeftRadius: 6,
                                }
                            }
                          >
                            {msg.content}
                          </div>
                          <span
                            className={`text-xs font-light ${isMe ? 'text-right' : 'text-left'}`}
                            style={{ color: 'hsl(var(--muted-foreground) / 0.6)' }}
                          >
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
              <div ref={bottomRef} />
            </div>

            {/* 输入框 */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ borderTop: '1px solid hsl(var(--border))' }}
            >
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('inputPlaceholder')}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-light focus:outline-none"
                style={{
                  background: 'hsl(var(--muted))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))',
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-30"
                style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}
              >
                <Send size={15} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm font-light" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {t('selectConversation')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}