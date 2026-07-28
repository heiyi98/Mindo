# Mindo 数据库文档

Supabase项目ID：`wsbskrgrkajnzzgpcfws`，PostgreSQL + RLS行级安全。

片语模块专属的表（`mind_cards`/`mind_card_folders`/`mind_card_comments`/`mind_card_notifications`等一整套）**不在本文档**，详见 `Mindo-片语.md`，避免两处各记一份不同步。本文档只收录跨模块或非片语的表。

## 一、核心表结构

```
users
  id, email, vip_tier(free/lifetime/pro), vip_expires_at
  language_preference, dashboard_layout(JSONB)
  handle, display_name, avatar_url

profiles
  id, user_id, display_name
  birth_date, birth_time, birth_lat, birth_lng
  birth_place_name, birth_timezone(IANA名称), gender
  is_self, is_minute_unknown, order_index
  is_self 的"每用户至多一个"由部分唯一索引强制保证：
  CREATE UNIQUE INDEX profiles_one_self_per_user ON public.profiles
  USING btree (user_id) WHERE (is_self = true)

bazi_snapshots
  id, profile_id, user_id
  calculation_result(JSONB，七段式存储，详见Mindo-八字.md)
  另有 ai_reading_draft/theme1-4/status 等遗留字段，AI解读职责已转移至
  bazi_readings，这些字段属死字段，待清理

bazi_readings
  id uuid
  user_id uuid → users.id
  profile_id uuid → profiles.id (可为NULL，档案被删时自动置空)
  profile_display_name text        ← 生成时快照
  birth_date date                  ← 生成时快照
  birth_time time                  ← 生成时快照
  birth_lat numeric                ← 生成时快照
  birth_lng numeric                ← 生成时快照
  birth_place_name text            ← 生成时快照
  birth_gender text                ← 生成时快照（不在前端显示）
  calculation_result jsonb         ← 报告自留的完整命盘快照，生成那一刻钉死，
                                      之后渲染报告命盘图表只读这一份，不再跨表
                                      查bazi_snapshots。老报告（此字段加入之前
                                      生成的）这一列是null，图表会缺失，不做
                                      数据迁移（用户决定：老账号回头整个注销）
  ai_reading_draft jsonb
  ai_reading_theme1 jsonb
  ai_reading_theme2 jsonb
  ai_reading_theme3 jsonb
  ai_reading_theme4 jsonb
  ai_reading_status text
  created_at timestamptz
  purchase_id uuid → purchases.id

astrology_snapshots
  id, profile_id, user_id
  calculation_result(JSONB)
  ai_reading(text), ai_reading_translated(JSONB)

bigfive_assessments
  id, profile_id, user_id
  domain_scores(JSONB), facet_scores(JSONB)
  region_country/level1/level2/level3, region_display_name
  age_group, gender, submitted_at

bigfive_norms
  id, region_country/level1/level2/level3, gender, age_group
  statistics(JSONB), sample_size, last_updated

life_timeline
  id, profile_id(UNIQUE), user_id
  baseline_imbalance, baseline_energies(JSONB), years(JSONB)

products
  id, assessment_type(UNIQUE), name, description
  lemon_variant_id, price_usd, is_active

purchases
  id, user_id, snapshot_type, provider, provider_order_id(UNIQUE)
  amount_cents, currency, status, snapshot_id
  snapshot_id 无数据库外键约束（需兼容指向多张不同快照表，
  合法性完全靠代码层保证）

subscriptions
  id, user_id, provider, provider_subscription_id(UNIQUE)
  status, current_period_start/end

follows
  id, follower_id, following_id, created_at
  组合唯一约束 UNIQUE(follower_id, following_id)（约束名
  follows_follower_id_following_id_key），"互相关注=好友"判定可直接放心使用。
  这张表是片语模块的关注/私信功能、以及u/[handle]通用社交主页共用的同一套
  关注关系，不是片语专属，所以放在本文档而不是Mindo-片语.md

conversations
  id, created_at

conversation_participants
  conversation_id + user_id（组合主键）, last_read_at

messages
  id, conversation_id, sender_id, content, created_at

celebrities
  id, stem_id, name, portrait_url, display_order, locale, is_active
```

## 二、外键关系（已用SQL核实，不是猜测）

```
public.users.id            → auth.users(id)         ON DELETE CASCADE   ← 本来就存在，删Auth用户会正确级联清空users及其下所有表
profiles.user_id           → users.id                ON DELETE CASCADE
bazi_readings.profile_id   → profiles.id             ON DELETE SET NULL  ← profile_id列允许NULL，原本是NOT NULL
bazi_readings.purchase_id  → purchases.id            ON DELETE SET NULL
(其余 profile_id/user_id 外键均为 CASCADE)
```

**已知架构缺口（未修复，留作待办）**：`public.users` 表本身没有指向 `auth.users` 的外键（只是id恰好相同，数据库不知道这是同一个人）。这意味着：**通过 Authentication → Users 删除一个账户，能正确级联清空** `users`**及其下游所有表**（因为users.id有FK指向auth.users），但**反过来直接操作** `public.users` **单独一行（比如手动删测试数据）不会有任何反向保护**。以后重置测试账号必须从 Authentication → Users 删除，不要直接在数据表里删行——这条操作纪律比任何代码兜底都重要，已同步记入`CLAUDE.md`"关键教训"。

## 三、`handle_new_user()` 触发器（auth schema）

```sql
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
```

挂在 `auth.users` 的 `AFTER INSERT` 事件（触发器名`on_auth_user_created`，在auth schema，不在public schema，Database Triggers页面要切schema才能看到）。**只在真正发生一次INSERT时触发**——如果只删了`public.users`这一行、`auth.users`那个身份还在，这个账户会永久卡死（新登录不算INSERT，触发器不会再跑，`public.users`的行永远补不回来）。应用层的自愈逻辑见`Mindo-认证与账户.md`第三节。

## 四、重要业务规则

- 档案编辑只清空 `bazi_snapshots`（八字盘重算），不碰 `bazi_readings`（报告永久保留）
- 报告渲染完全自包含：只读 `bazi_readings.calculation_result`，不依赖 `profiles`/`bazi_snapshots` 是否还存在
- "出生信息不符"提示：只在 `reading.profile_id` 非空（档案还存在）时才比对和显示；档案被删了就不提示，也不支持"重新生成"
- 资产管理显示所有 `bazi_readings` 记录，不过滤 status（支持中断恢复入口）
- 出生性别仅存数据库用于算法，绝对不在前端任何地方显示
- **报告生成语言未被记录**（已知缺口，用户决定暂不处理）：Gemini prompt固定中文指令、固定中文键名输出，数据库没有任何字段记录"这份报告用什么语言生成"。以后要做"报告语言标注"UI功能，必须先补上这整套记录机制

## 五、待完成

- [ ] `public.users`补一个指向`auth.users(id)`的外键（ON DELETE CASCADE），或者写一个对称的`handle_deleted_user`触发器——目前删Auth用户不会自动清空public.users这一层
