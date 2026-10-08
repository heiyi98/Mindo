-- ============================================================
-- Mindo 改为"只验证 Alethego 签发的令牌"（与 TaskApp 同一模式）
--
-- 背景：普通用户的注册/登录/续期全部由 Alethego 身份项目负责，Mindo 项目
-- 通过已登记好的 Third-Party Auth 信任直接接受 Alethego 的 access token：
--   auth.uid()              = Alethego 用户编号（token 的 sub）
--   auth.jwt() ->> 'email'  = 用户邮箱
-- 这些用户在 Mindo 的 auth.users 里没有任何记录，所以：
--   1. public.users 不能再有指向 auth.users 的外键；
--   2. 业务表的外键一律指向 public.users，不指向 auth.users；
--   3. public.users 的行不再由 auth.users 上的触发器创建，改由前端/回调
--      在登录后调用 public.ensure_current_user() 自己建。
--
-- 不动的东西（务必遵守）：
--   - Third-Party Auth 登记、taskapp schema：本脚本完全不碰；
--   - public.admin 表及其指向 auth.users 的外键：管理员账号仍然是 Mindo
--     自己 Supabase Auth 里的真实账号，下面所有自动处理都显式跳过它。
--
-- 执行前提：内测数据已清空（public.users 为空），所以可以直接加 NOT NULL。
-- 整个脚本是一个事务，任何一步失败都会整体回滚，不会留下半成品。
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. 删掉 auth.users 上的 handle_new_user 触发器
--    普通用户不再进 auth.users，这个触发器只会在"创建后台管理员账号"时
--    触发；而下面 display_name 改成 NOT NULL 之后，它插的那行（只有id+email）
--    会直接报错、导致管理员账号创建失败——所以必须删。
--    create-admin-account.mjs 里"删掉触发器顺手建的影子行"那一步会变成
--    删0行的空操作，不影响脚本运行。
-- ------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- ------------------------------------------------------------
-- 2. 解除所有指向 auth.users 的外键（public.admin 除外）
--    - public.users 自己的那条：直接删掉。
--    - 其他表上"指向终端用户"的列（列名在下面白名单里）：改指向 public.users(id)，
--      ON DELETE CASCADE（注销 = 删 public.users 这一行，下游数据随之清空）。
--    - 其他列名（比如可能存的是管理员id的 granted_by/created_by 之类）：不自动改，
--      只打印 NOTICE，执行后看"消息"面板里有没有 SKIPPED 字样，有就把结果发给 Claude。
-- ------------------------------------------------------------
do $$
declare
  r record;
  col text;
  user_cols text[] := array[
    'user_id', 'follower_id', 'following_id', 'sender_id', 'recipient_id',
    'receiver_id', 'author_id', 'owner_id', 'actor_id', 'viewer_id',
    'blocker_id', 'blocked_id', 'target_user_id', 'from_user_id', 'to_user_id'
  ];
begin
  for r in
    select c.oid, c.conname, c.conrelid::regclass as tbl, c.conkey,
           n.nspname, t.relname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and n.nspname = 'public'
      and t.relname <> 'admin'
  loop
    if r.relname = 'users' then
      execute format('alter table %s drop constraint %I', r.tbl, r.conname);
      raise notice 'DROPPED  %.% (public.users -> auth.users)', r.tbl, r.conname;
      continue;
    end if;

    if array_length(r.conkey, 1) <> 1 then
      raise notice 'SKIPPED  %.% (多列外键，需人工处理)', r.tbl, r.conname;
      continue;
    end if;

    select a.attname into col
    from pg_attribute a
    where a.attrelid = r.tbl and a.attnum = r.conkey[1];

    if not (col = any(user_cols)) then
      raise notice 'SKIPPED  %.% (列 % 不在终端用户列白名单，可能指向管理员，需人工确认)', r.tbl, r.conname, col;
      continue;
    end if;

    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references public.users(id) on delete cascade',
      r.tbl, r.conname, col
    );
    raise notice 'REPOINTED %.% (%) -> public.users(id)', r.tbl, r.conname, col;
  end loop;
end
$$;

-- ------------------------------------------------------------
-- 3. public.users 结构对齐
--    id 默认取 auth.uid()（= Alethego 用户编号）；display_name 必填且不能是空白；
--    补 created_at / updated_at；handle 保证唯一（ensure_current_user 靠唯一约束
--    冲突重试来生成不重复的 handle）。
-- ------------------------------------------------------------
alter table public.users alter column id set default auth.uid();

alter table public.users add column if not exists display_name text;
alter table public.users alter column display_name set not null;
alter table public.users drop constraint if exists users_display_name_not_blank;
alter table public.users add constraint users_display_name_not_blank check (btrim(display_name) <> '');

alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();

create unique index if not exists users_handle_unique on public.users (handle);

create or replace function public.users_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.users_touch_updated_at();

-- ------------------------------------------------------------
-- 4. RLS：只对 authenticated 开放，按 auth.uid() 判断归属
--    原有的 select/update 等策略保持不动（它们本来就用 auth.uid()，换成
--    Alethego 令牌后照样生效）；这里只补"自己建自己那一行"需要的三条，
--    名字固定、可重复执行。
-- ------------------------------------------------------------
alter table public.users enable row level security;

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users
  for select to authenticated
  using (id = auth.uid());

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant select, insert, update on public.users to authenticated;

-- ------------------------------------------------------------
-- 5. ensure_current_user：登录后、读写任何业务数据之前调用一次
--    - 第一次：建一行（id = auth.uid()，email，display_name，自动生成 handle，
--      可选写入当时的界面语言）；
--    - 之后每次：只把 email 更新成 Alethego 的最新值，display_name / handle /
--      语言偏好都不覆盖（用户在 Mindo 里改的名字不会被 Alethego 冲掉）。
--    以调用者身份执行（不是 security definer），仍受上面 RLS 约束。
--    参数比 TaskApp 版多一个可选的 p_language（Mindo 的语言偏好），不传就是 null。
-- ------------------------------------------------------------
drop function if exists public.ensure_current_user(text, text);
drop function if exists public.ensure_current_user(text, text, text);

create function public.ensure_current_user(
  p_email text,
  p_display_name text,
  p_language text default null
)
returns public.users
language plpgsql
set search_path = ''
as $$
declare
  v_row public.users;
  v_name text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_handle text;
  v_attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'ensure_current_user: not authenticated' using errcode = '28000';
  end if;

  if v_name is null then
    v_name := coalesce(nullif(split_part(coalesce(p_email, ''), '@', 1), ''), 'User');
  end if;

  -- 已经有这一行：只更新 email
  update public.users
     set email = p_email
   where id = auth.uid()
  returning * into v_row;
  if found then
    return v_row;
  end if;

  -- 第一次：建行。handle 冲突（极小概率）就换一个重试。
  loop
    v_attempt := v_attempt + 1;
    v_handle := 'mindo_' || substr(md5(gen_random_uuid()::text), 1, 6);
    begin
      insert into public.users (id, email, display_name, handle, language_preference)
      values (auth.uid(), p_email, v_name, v_handle, p_language)
      on conflict (id) do update set email = excluded.email
      returning * into v_row;
      return v_row;
    exception when unique_violation then
      if v_attempt >= 10 then
        raise;
      end if;
    end;
  end loop;
end;
$$;

revoke all on function public.ensure_current_user(text, text, text) from public, anon;
grant execute on function public.ensure_current_user(text, text, text) to authenticated;

commit;

-- 让 Data API 立刻认到新函数（见 CLAUDE.md "关键教训"里的 PGRST205）
notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- 执行后自查：下面这条应该只剩 public.admin 一行
-- ------------------------------------------------------------
select c.conrelid::regclass as table_name, c.conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.contype = 'f' and c.confrelid = 'auth.users'::regclass;
