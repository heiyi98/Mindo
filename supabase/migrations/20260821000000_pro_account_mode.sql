-- Pro账号模式：复刻VIP的同构实现（users.pro_expires_at + pro_transactions + extend_pro）
-- 见 Mindo-支付系统.md「Pro账号模式」一节

-- 1. users表新增pro_expires_at，结构对齐vip_expires_at
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

-- 2. pro_transactions表，结构对齐vip_transactions
CREATE TABLE IF NOT EXISTS public.pro_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  days_delta integer NOT NULL,
  expires_at_after timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN ('redeem','admin_grant','admin_revoke')),
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. extend_pro数据库函数，逻辑对齐extend_vip：
--    GREATEST(当前到期时间, 现在) + days，同一事务内写一笔流水
CREATE OR REPLACE FUNCTION extend_pro(
  p_user_id uuid, p_days integer, p_type text, p_actor_id uuid
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_expiry timestamptz;
BEGIN
  UPDATE public.users
  SET pro_expires_at = GREATEST(COALESCE(pro_expires_at, now()), now()) + (p_days || ' days')::interval
  WHERE id = p_user_id
  RETURNING pro_expires_at INTO v_new_expiry;

  INSERT INTO public.pro_transactions (user_id, days_delta, expires_at_after, type, actor_id)
  VALUES (p_user_id, p_days, v_new_expiry, p_type, p_actor_id);

  RETURN v_new_expiry;
END;
$$;

-- 4. redemption_code_batches.reward_type 加 'pro'：
--    若该列是 text 列（代码层 RewardType 联合类型校验，非数据库层约束），这一步不需要任何SQL。
--    以下诊断查询用于确认列的实际约束方式——若返回了 CHECK/enum 相关的 constraint，
--    需要额外一条 ALTER 才能放行 'pro'，请把返回结果发回来，我再给对应的 ALTER 语句：
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.redemption_code_batches'::regclass
  AND pg_get_constraintdef(oid) ILIKE '%reward_type%';
