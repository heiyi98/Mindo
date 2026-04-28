-- ============================================
-- DestinOS Database Schema
-- 所有ID使用UUID v7（gen_random_uuid暂代，
-- 生产环境替换为uuid_generate_v7）
-- ============================================

-- 启用必要扩展
create extension if not exists "uuid-ossp";

-- ============================================
-- 用户扩展表（扩展Supabase Auth的auth.users）
-- ============================================
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  vip_tier text not null default 'free'
    check (vip_tier in ('free', 'monthly', 'lifetime')),
  vip_expires_at timestamptz,
  language_preference text not null default 'en'
    check (language_preference in ('en','zh','fr','es','ja','ko','vi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 观测对象档案表
-- 一个用户可建多个档案（自己/伴侣/父母等）
-- 免费用户限1个，VIP无限（业务层控制）
-- ============================================
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  display_name text not null,
  birth_date date not null,
  birth_time time,
  birth_lat numeric(9,6),
  birth_lng numeric(9,6),
  birth_place_name text,
  is_self boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 测算快照表
-- 每种测算类型独立存储，与买断制对应
-- ============================================
create table public.snapshots (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade not null,
  -- 测算类型由业务层控制，不在数据库层枚举，便于未来扩展
  snapshot_type text not null,
  input_hash text not null,
  calculation_result jsonb not null,
  ai_reading text,
  ai_reading_generated_at timestamptz,
  created_at timestamptz not null default now(),
  unique(profile_id, snapshot_type)
);

-- ============================================
-- 订阅记录表（月付）
-- ============================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  -- 支付渠道由业务层控制，国际版与中国版使用不同渠道
  provider text not null,
  provider_subscription_id text unique,
  status text not null check (status in ('active','cancelled','expired','past_due')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 买断记录表（单次购买命理/心理报告）
-- ============================================
create table public.purchases (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  -- 测算类型由业务层控制，不在数据库层枚举，便于未来扩展
  snapshot_type text not null,
  -- 支付渠道由业务层控制，国际版与中国版使用不同渠道
  provider text not null,
  provider_order_id text unique,
  amount_cents integer not null,
  currency text not null default 'usd',
  purchased_at timestamptz not null default now()
);

-- ============================================
-- Row Level Security
-- ============================================

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.snapshots enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchases enable row level security;

-- users表：只能读写自己的行
create policy "users: self only"
  on public.users for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- profiles表：只能读写自己的档案
create policy "profiles: owner only"
  on public.profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- snapshots表：通过profile归属判断
create policy "snapshots: owner only"
  on public.snapshots for all
  using (
    auth.uid() = (
      select user_id from public.profiles
      where id = profile_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from public.profiles
      where id = profile_id
    )
  );

-- snapshots表：ai_reading字段对free用户屏蔽
-- （通过视图实现，而非RLS，因为RLS无法过滤列）
create view public.snapshots_safe as
  select
    s.id,
    s.profile_id,
    s.snapshot_type,
    s.input_hash,
    s.calculation_result,
    case
      when u.vip_tier = 'free' then null
      else s.ai_reading
    end as ai_reading,
    s.ai_reading_generated_at,
    s.created_at
  from public.snapshots s
  join public.profiles p on p.id = s.profile_id
  join public.users u on u.id = p.user_id
  where auth.uid() = p.user_id;

-- subscriptions表：只能读写自己的
create policy "subscriptions: owner only"
  on public.subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- purchases表：只能读写自己的
create policy "purchases: owner only"
  on public.purchases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================
-- 自动更新updated_at的触发器
-- ============================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

-- ============================================
-- 新用户注册时自动创建users行
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- 索引
-- ============================================

create index profiles_user_id_idx on public.profiles(user_id);
create index snapshots_profile_id_idx on public.snapshots(profile_id);
create index snapshots_type_idx on public.snapshots(snapshot_type);
create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index purchases_user_id_idx on public.purchases(user_id);

-- ============================================
-- 2026-04-xx: snapshots表扩展
-- 付费快照直接关联user，独立于profile存在
-- ============================================
alter table public.snapshots
add column if not exists birth_date date,
add column if not exists birth_time time,
add column if not exists birth_place_name text,
add column if not exists user_id uuid references public.users(id) on delete cascade;

create index if not exists snapshots_user_id_idx on public.snapshots(user_id);
