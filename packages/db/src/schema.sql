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

-- ============================================
-- 2026-05-01: products表（付费产品目录）
-- ============================================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_type text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  lemon_variant_id text NOT NULL,
  price_usd numeric(10,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (true);

-- ============================================
-- 2026-05-01: purchases表扩展
-- 添加 status 字段和 snapshot_id 外键
-- ============================================
ALTER TABLE public.purchases
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS snapshot_id uuid REFERENCES public.snapshots(id) ON DELETE SET NULL;

-- ============================================
-- 2026-08-05: 付费系统重构
-- 删除products/purchases/subscriptions（无真实数据，不做迁移），
-- 新建虚拟币/VIP流水/服务覆盖凭证/兑换码体系，详见 Mindo-支付系统.md
-- ============================================

-- bazi_readings.purchase_id 外键指向即将删除的purchases表，
-- 需先去掉这个引用，否则 DROP TABLE purchases 会报依赖错误
ALTER TABLE public.bazi_readings DROP COLUMN IF EXISTS purchase_id;

DROP TABLE IF EXISTS public.purchases;
DROP TABLE IF EXISTS public.subscriptions;
DROP TABLE IF EXISTS public.products;

-- 虚拟币余额，一人一行
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 虚拟币流水，每笔加减都留痕
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,              -- 正数=入账，负数=扣款
  balance_after integer NOT NULL,
  type text NOT NULL,                   -- 'redeem' / 'ai_generation' / 'refund' / 'admin_grant' / 'topup' / 'voucher_partial_charge' / 'sponsor_coverage'
  reference_id uuid,                    -- 指向bazi_readings.id/redemption_codes.id等，不设外键约束，合法性由代码层保证
  actor_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 各服务消耗多少虚拟币，可后台改
CREATE TABLE public.service_prices (
  service_type text PRIMARY KEY,        -- 'bazi_report' / 'bigfive_report' / 'western_report' 等
  price integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 各货币充值兑换虚拟币的汇率，可后台改
CREATE TABLE public.wallet_topup_rates (
  currency_code text PRIMARY KEY,       -- 'USD' / 'CNY' / 'EUR' 等
  wallet_units_per_unit numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- VIP变动流水（VIP状态本身仍在users.vip_expires_at，这张只留痕）
CREATE TABLE public.vip_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  days_delta integer NOT NULL,
  expires_at_after timestamptz NOT NULL,
  type text NOT NULL,                   -- 'redeem' / 'admin_grant' / 'admin_revoke' / 'voucher_full'
  actor_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 兑换码批次（要先建，service_coverage_vouchers的外键指向它）
CREATE TABLE public.redemption_code_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_prefix text NOT NULL,            -- 如'MINDO'，同时作为issuer_label来源
  reward_type text NOT NULL,            -- 'wallet' / 'vip' / 'voucher'
  reward_config jsonb NOT NULL,
  code_expires_at timestamptz,
  total_count integer NOT NULL,
  note text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 服务覆盖凭证（体验券+折扣券合一，兼容VIP）
CREATE TABLE public.service_coverage_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_type text NOT NULL,           -- 与service_prices取值同一套字符串，或'vip_subscription'
  coverage_type text NOT NULL,          -- 'full' / 'percentage' / 'fixed_amount'
  coverage_value numeric NOT NULL,
  remaining_uses integer NOT NULL DEFAULT 1,
  issuer_label text,
  source_batch_id uuid REFERENCES public.redemption_code_batches(id),
  actor_id uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 具体每一张兑换码
CREATE TABLE public.redemption_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.redemption_code_batches(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'unused', -- 'unused' / 'redeemed' / 'expired'
  redeemed_by uuid REFERENCES public.users(id),
  redeemed_at timestamptz
);

CREATE INDEX wallet_transactions_user_id_idx ON public.wallet_transactions(user_id);
CREATE INDEX vip_transactions_user_id_idx ON public.vip_transactions(user_id);
CREATE INDEX service_coverage_vouchers_user_id_idx ON public.service_coverage_vouchers(user_id);
CREATE INDEX service_coverage_vouchers_service_type_idx ON public.service_coverage_vouchers(service_type);
CREATE INDEX redemption_codes_batch_id_idx ON public.redemption_codes(batch_id);

-- RLS：只对跟钱直接相关的三张表加最简单的兜底策略（只允许user_id=当前登录用户），
-- 后端接口本来就用service role key绕过RLS、在接口代码里做权限判断，这条策略只在
-- 万一漏了权限判断或误用了客户端类型时兜底，不影响正常接口，也不影响/admin后台
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallets: self only" ON public.wallets
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_transactions: self only" ON public.wallet_transactions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

ALTER TABLE public.service_coverage_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_coverage_vouchers: self only" ON public.service_coverage_vouchers
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================
-- 2026-08-05: 付费系统 —— 原子操作用的数据库函数
-- Supabase JS客户端不支持"balance = balance - x"这种基于自身列运算的更新，
-- 扣款/续期/核销凭证要做到真正的一步原子操作，必须用数据库函数（而不是先
-- SELECT查询再在代码里判断再UPDATE，那样中间有竞态窗口）
-- ============================================

-- 扣款：余额不足时返回NULL，成功时返回扣款后余额并记一笔流水
CREATE OR REPLACE FUNCTION public.deduct_wallet(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance integer;
BEGIN
  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO v_balance;

  IF v_balance IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.wallet_transactions (user_id, amount, balance_after, type, reference_id, actor_id)
  VALUES (p_user_id, -p_amount, v_balance, p_type, p_reference_id, p_actor_id);

  RETURN v_balance;
END;
$$;

-- 入账（充值/兑换码/退款/管理员发放通用）：钱包行不存在时自动建一行，
-- 返回入账后余额并记一笔流水
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id uuid,
  p_amount integer,
  p_type text,
  p_reference_id uuid DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance integer;
BEGIN
  INSERT INTO public.wallets (user_id, balance)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
    SET balance = public.wallets.balance + p_amount, updated_at = now()
  RETURNING balance INTO v_balance;

  INSERT INTO public.wallet_transactions (user_id, amount, balance_after, type, reference_id, actor_id)
  VALUES (p_user_id, p_amount, v_balance, p_type, p_reference_id, p_actor_id);

  RETURN v_balance;
END;
$$;

-- VIP续期：GREATEST(当前到期时间, 现在)保证提前兑换不会吞掉还没到期的时长，
-- 返回续期后的到期时间并记一笔流水
CREATE OR REPLACE FUNCTION public.extend_vip(
  p_user_id uuid,
  p_days integer,
  p_type text,
  p_actor_id uuid DEFAULT NULL
) RETURNS timestamptz
LANGUAGE plpgsql
AS $$
DECLARE
  v_expires_at timestamptz;
BEGIN
  UPDATE public.users
  SET vip_expires_at = GREATEST(COALESCE(vip_expires_at, now()), now()) + (p_days || ' days')::interval
  WHERE id = p_user_id
  RETURNING vip_expires_at INTO v_expires_at;

  INSERT INTO public.vip_transactions (user_id, days_delta, expires_at_after, type, actor_id)
  VALUES (p_user_id, p_days, v_expires_at, p_type, p_actor_id);

  RETURN v_expires_at;
END;
$$;

-- 核销服务覆盖凭证：remaining_uses<=0或不是本人的凭证时不返回任何行
CREATE OR REPLACE FUNCTION public.consume_voucher(
  p_voucher_id uuid,
  p_user_id uuid
) RETURNS TABLE(
  id uuid,
  remaining_uses integer,
  coverage_type text,
  coverage_value numeric,
  service_type text,
  issuer_label text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.service_coverage_vouchers v
  SET remaining_uses = v.remaining_uses - 1
  WHERE v.id = p_voucher_id
    AND v.user_id = p_user_id
    AND v.remaining_uses > 0
  RETURNING v.id, v.remaining_uses, v.coverage_type, v.coverage_value, v.service_type, v.issuer_label;
END;
$$;

-- 归还一次凭证使用次数：AI生成失败、或核销后续的自付扣款失败时用来补偿
CREATE OR REPLACE FUNCTION public.restore_voucher_use(
  p_voucher_id uuid
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining integer;
BEGIN
  UPDATE public.service_coverage_vouchers
  SET remaining_uses = remaining_uses + 1
  WHERE id = p_voucher_id
  RETURNING remaining_uses INTO v_remaining;

  RETURN v_remaining;
END;
$$;

-- 兑换码核销：码不存在/已用过/批次已过期都不会返回任何行，
-- 由调用方后续再查一次原因（不影响本次原子性，只是为了给前端更准确的错误提示）
CREATE OR REPLACE FUNCTION public.redeem_code(
  p_code text,
  p_user_id uuid
) RETURNS TABLE(id uuid, batch_id uuid)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.redemption_codes rc
  SET status = 'redeemed', redeemed_by = p_user_id, redeemed_at = now()
  FROM public.redemption_code_batches b
  WHERE rc.batch_id = b.id
    AND rc.code = p_code
    AND rc.status = 'unused'
    AND (b.code_expires_at IS NULL OR b.code_expires_at > now())
  RETURNING rc.id, rc.batch_id;
END;
$$;

-- ============================================
-- 2026-08-05: 付费系统接入八字AI报告生成 —— bazi_readings扩展
-- 记录这份报告是怎么付款的，卡住太久时reading-recovery这个cron才知道
-- 该退多少虚拟币、该不该把凭证的使用次数还回去
-- ============================================
ALTER TABLE public.bazi_readings
ADD COLUMN IF NOT EXISTS charge_type text,              -- 'wallet' / 'voucher' / NULL(未收费，如后台直接生成)
ADD COLUMN IF NOT EXISTS charge_wallet_amount integer,   -- 实际扣了多少虚拟币（wallet全额或voucher的自付部分），没扣则为0/NULL
ADD COLUMN IF NOT EXISTS charge_voucher_id uuid REFERENCES public.service_coverage_vouchers(id),
ADD COLUMN IF NOT EXISTS charge_refunded_at timestamptz; -- 已退款/已归还凭证的标记，防止cron重复退款

-- ============================================
-- 2026-08-06: 充值套餐系统，替换掉原本按统一汇率换算的wallet_topup_rates
-- 管理员自定义若干个虚拟币数量档位，每个档位下针对不同货币各自手动定价，
-- 不要求符合统一比例，允许做地区性差异化定价
-- ============================================
DROP TABLE IF EXISTS public.wallet_topup_rates;

CREATE TABLE public.wallet_topup_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_amount integer NOT NULL,       -- 这个档位兑换多少虚拟币，如 60/600/6000
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wallet_topup_tier_prices (
  tier_id uuid NOT NULL REFERENCES public.wallet_topup_tiers(id) ON DELETE CASCADE,
  currency_code text NOT NULL,
  price numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tier_id, currency_code)
);
