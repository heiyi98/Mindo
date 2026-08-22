-- 内容库（Codex）从文件系统+Keystatic方案改为数据库驱动方案。
-- 词条身份变成永久id，归类变成树状记录，不再靠文件夹路径。
-- 全部codex_*表启用RLS但不写policy（默认拒绝一切），前台读取和后台写入
-- 统一走service role client，跟packages/db/src/payments同款做法，理由见
-- Mindo-内容库.md新增章节。

-- ============================================================
-- 后台管理员账号（admin表）：跟 public.users 彻底分开的独立身份体系，
-- 不止服务内容库，以后任何后台功能（订单管理、客服后台等）都可以复用
-- 这张表本身——但"能管什么"这件事（权限颗粒度）这次只做内容库需要的
-- codex_admin_scopes，不提前设计成覆盖未来全部后台模块的通用权限系统，
-- 见 Mindo-内容库.md 12.3节。
--
-- 密码存储/登录验证复用 Supabase Auth 自带的账号系统（不自己写加密逻辑）：
-- 每个admin行的id就是对应auth.users的id，靠 supabase.auth.admin.createUser()
-- 创建（apps/web/scripts/create-admin-account.mjs），创建后立刻删掉
-- handle_new_user() 触发器自动生成的那条 public.users 影子记录——不修改
-- handle_new_user() 本身（那是全站每个人注册都会走一次的共享触发器，
-- 没有必要为了这一个新用途去改动它、承担改错影响全站注册的风险）。
-- 这样 admin 账号在 auth.users 里是一个真实、能正常登录验证密码的身份，
-- 但在 public.users 里不存在任何痕迹，两套身份体系除了共用同一个
-- Supabase Auth 密码验证机制之外，互不关联、互不可见。
-- 不开放自助注册：只能靠开发者跑这个脚本手动创建账号。
CREATE TABLE public.admin (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
-- 启用RLS但不写policy＝默认拒绝anon/authenticated的一切直接访问，只有
-- service role client能读写——这张表比codex_*更敏感，同样的收紧方式。

-- ============================================================

CREATE TABLE public.codex_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.codex_categories(id) ON DELETE RESTRICT,
  home_entry_id uuid, -- FK稍后补，见下方（先建表，避免categories/entries互相引用导致建表顺序死锁）
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.codex_category_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.codex_categories(id) ON DELETE CASCADE,
  locale text NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  UNIQUE (category_id, locale)
);
-- 同一父级下 slug 不重复这条规则，放在应用层（repository写入前查一次）校验，
-- 不在这里加DB约束——分类slug只用来拼面包屑展示，真正查词条只看URL最后一段，
-- 加一个需要触发器才能实现的DB约束换来的保障，价值配不上它的复杂度。

CREATE TABLE public.codex_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.codex_categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz -- 首次正式发布时间，为未来定时发布/blog复用预留，本轮不实现"定时"本身
);

ALTER TABLE public.codex_categories
  ADD CONSTRAINT codex_categories_home_entry_id_fkey
  FOREIGN KEY (home_entry_id) REFERENCES public.codex_entries(id) ON DELETE SET NULL;

CREATE TABLE public.codex_entry_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.codex_entries(id) ON DELETE CASCADE,
  locale text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  body jsonb NOT NULL DEFAULT '{}'::jsonb, -- Tiptap原生JSON文档
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, locale)
);
-- slug唯一性范围：只在status='published'时强制同語言全局唯一（partial unique
-- index）。草稿阶段允许slug暂时重复（标题还没定稿），真正发布那一刻才检查。
CREATE UNIQUE INDEX codex_entry_translations_locale_slug_published
  ON public.codex_entry_translations (locale, slug) WHERE status = 'published';

CREATE TABLE public.codex_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_translation_id uuid NOT NULL REFERENCES public.codex_entry_translations(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  title text NOT NULL,
  url text,
  UNIQUE (entry_translation_id, order_index)
);
-- 站内链接（Xref）不建表：直接在body(jsonb)里以Tiptap自定义节点形式存在
-- （节点attrs记目标entry_id+显示文字），渲染时实时查目标词条标题/摘要，不需要
-- 额外持久化关联表。

CREATE TABLE public.codex_admin_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.codex_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (admin_id, category_id)
);
-- 语义：某个admin账号在这张表里一行都没有＝超级管理员（不限分类）；
-- 有记录＝只能编辑这些分类（含其全部子孙分类，递归判断在代码层做）。
-- 指向 public.admin 而不是 public.users——见上方admin表的说明。

CREATE INDEX codex_categories_parent_id_idx ON public.codex_categories(parent_id);
CREATE INDEX codex_entries_category_id_idx ON public.codex_entries(category_id);
CREATE INDEX codex_entry_translations_entry_id_idx ON public.codex_entry_translations(entry_id);
CREATE INDEX codex_citations_entry_translation_id_idx ON public.codex_citations(entry_translation_id);
CREATE INDEX codex_admin_scopes_admin_id_idx ON public.codex_admin_scopes(admin_id);

ALTER TABLE public.codex_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codex_category_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codex_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codex_entry_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codex_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.codex_admin_scopes ENABLE ROW LEVEL SECURITY;
-- 全部启用RLS但不写任何policy＝默认拒绝anon/authenticated的一切直接访问，
-- 只有service role client能读写。前台公开页面的"读"也走service role
-- （在Next.js服务端完成，不是让浏览器直连），不是遗漏。

NOTIFY pgrst, 'reload schema';
