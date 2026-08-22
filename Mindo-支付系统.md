# Mindo 支付系统文档

虚拟币 + VIP会员 + 服务覆盖凭证 + 兑换码，取代原先的 `products`/`purchases`/`subscriptions` 三张表（无真实数据，未做迁移，已删除）。

## 一、用户的四类资产

1. **虚拟币**（`wallets`/`wallet_transactions`）——买断制服务（各类命理报告）用，永久不贬值、不可转让、不可提现。
2. **VIP会员**——订阅制服务用，复用 `users.vip_expires_at`，只判断"是否在有效期内"（`vip_expires_at > now()`）。`users.vip_tier`（`free`/`lifetime`/`pro`）字段本身还在表里（没删，避免牵连未知引用），但**全项目代码已不再读取它**——档案数量限制等老逻辑之前还在读`vip_tier`导致跟新系统判断对不上，已统一改成读`vip_expires_at`。永久会员用一个极远未来日期表示，不需要`vip_tier`参与任何判断。
3. **服务覆盖凭证**（`service_coverage_vouchers`）——锁定单一具体服务的一次性资格（全免/百分比折扣/固定金额抵扣），用户自己在服务页面选择用不用、用哪张。
4. **兑换码**（`redemption_codes`/`redemption_code_batches`）——触发以上三类资产入账的载体，不是资产本身。

现阶段唯一入账渠道是兑换码，Stripe/微信支付/支付宝暂未接入。Lemon Squeezy（`/api/payments/checkout`、`/api/payments/webhook`）**明确保留但已跑不通**（依赖的`products`/`purchases`表已删除）——这是用户本次施工时的明确决定，不是遗漏，以后要不要接入真实支付渠道再单独决定。

**Pro账号模式**（2026-08-21新增，与以上四类资产平行、彼此不影响判断逻辑）单独见本文档「十二、Pro账号模式」一节。**注意区分**：`users.vip_tier`这个死字段的历史取值里恰好也有一个字符串`'pro'`，那是VIP等级的旧枚举值（全项目代码已不读取，见上方第2点），跟这里的Pro账号模式是两个完全不相关的东西，只是碰巧字面重名。

## 二、数据库表结构（以实际执行的SQL为准）

```
wallets
  user_id uuid PK → users(id)
  balance integer 默认0
  updated_at

wallet_transactions
  id, user_id, amount(正入负出), balance_after
  type: 'redeem'/'ai_generation'/'refund'/'admin_grant'/'topup'/'voucher_partial_charge'/'sponsor_coverage'
  reference_id（指向bazi_readings.id/redemption_codes.id等，无外键约束，合法性由代码层保证）
  actor_id（管理员直接操作时记录是谁，用户自己触发时为NULL）

service_prices
  service_type text PK（如'bazi_report'）, price integer, updated_at

wallet_topup_tiers（取代原本按统一汇率换算的wallet_topup_rates）
  id, wallet_amount(这档兑换多少虚拟币), display_order, is_active

wallet_topup_tier_prices
  tier_id + currency_code 组合主键 → wallet_topup_tiers(id)
  price numeric, updated_at
  同一档位在不同货币下各自独立定价，不要求符合统一汇率，
  允许地区性差异化定价

vip_transactions
  id, user_id, days_delta, expires_at_after
  type: 'redeem'/'admin_grant'/'admin_revoke'/'voucher_full'
  actor_id

redemption_code_batches
  id, code_prefix, reward_type('wallet'/'vip'/'voucher'), reward_config(jsonb)
  code_expires_at(可为NULL=永久), total_count, note, created_by

service_coverage_vouchers
  id, user_id, service_type, coverage_type('full'/'percentage'/'fixed_amount')
  coverage_value, remaining_uses, issuer_label, source_batch_id, actor_id

redemption_codes
  id, batch_id, code(UNIQUE), status('unused'/'redeemed')
  redeemed_by, redeemed_at
  注：'expired'状态实际不会被写入数据库——批次过期靠code_expires_at在核销时实时
  判断拦截，不做定时状态回写。/admin/batches/[id]详情页里"已过期"这个展示状态是
  前端按当前时间现算的（status='unused'且code_expires_at已过），数据库里那一行
  的status字段本身仍然是'unused'，不代表真的被写成了'expired'

bazi_readings（在原表基础上新增）
  charge_type: 'wallet'/'voucher'/NULL
  charge_wallet_amount: 实际扣了多少虚拟币（wallet全额或voucher的自付部分）
  charge_voucher_id: 用了哪张凭证（若有）
  charge_refunded_at: 已退款/已归还凭证的标记，防止cron重复退款
  deleted_at: 软删除标记，非空即视为"已删除"，见「软删除与档案隔离」一节
  retry_count: 技术性失败的累计重试次数
  content_policy_retry_count: 内容政策拦截的累计重试次数，跟retry_count分开计数
  first_attempt_at / last_attempt_at: 判断45分钟总超时 / 距上次尝试的重试间隔
  alert_status: 非空代表卡在需要管理员介入的问题上，取值同system_alerts.alert_type

system_alerts（新表，见「重试引擎与失败分类」一节）
  id, reading_id → bazi_readings(id) ON DELETE SET NULL
  alert_type: 'api_key_invalid' / 'data_missing' / 'content_policy_exceeded'
  message, created_at, resolved_at
```

RLS：`wallets`/`wallet_transactions`/`service_coverage_vouchers`三张表开了RLS，策略是单条`user_id = auth.uid()`，是兜底用的——正常读写都走后端接口的service role client（`apps/web/src/lib/payments/adminClient.ts`），在接口代码里做权限判断，不依赖RLS，这条策略只在万一漏了权限判断或误用了客户端类型时起作用。`service_prices`/`wallet_topup_tiers`/`wallet_topup_tier_prices`/`redemption_codes`/`redemption_code_batches`不涉及个人数据，未加RLS。

`bazi_readings`（不属于`packages/payments`自己的表，但被这套系统接管了写入权限）RLS策略已收紧成**只保留SELECT**（`user_id = auth.uid()`，本人可读自己的报告），不给任何客户端角色INSERT/UPDATE/DELETE权限——这张表历史上一直有允许owner直接INSERT的policy，被本轮排查认定是一个真实的安全漏洞（详见第四节"排查记录"），已经堵上。

### 原子操作用的数据库函数

Supabase JS客户端不支持"balance = balance - x"这种基于自身列运算的更新，扣款/续期/核销要做到真正一步到位的原子操作，用了几个Postgres Function（`packages/db/src/schema.sql`里能查到完整SQL）：

- `deduct_wallet(p_user_id, p_amount, p_type, p_reference_id, p_actor_id)` → 扣款，余额不足返回NULL
- `credit_wallet(...)` → 入账，钱包行不存在会自动建一行
- `extend_vip(p_user_id, p_days, p_type, p_actor_id)` → VIP续期，`GREATEST(当前到期时间, 现在) + days`
- `consume_voucher(p_voucher_id, p_user_id)` → 凭证核销，原子递减`remaining_uses`
- `restore_voucher_use(p_voucher_id)` → 补偿：归还一次凭证使用次数
- `redeem_code(p_code, p_user_id)` → 兑换码核销，同时校验批次是否过期

## 三、packages/payments

不直接连接具体Supabase实例，所有函数第一个参数接收调用方传入的`LedgerAdapter`（其实就是`SupabaseClient`类型）。以后中国版/国际版分成两个数据库实例时，各自传各自的client即可，这里的函数不用改。

```
types.ts     LedgerAdapter / LedgerResult<T> / ok() / fail() / 各类型的TS类型
wallet.ts    deductWallet / creditWallet / refundWallet
vip.ts       extendVip / checkVipActive
vouchers.ts  listAvailableVouchers / consumeVoucher / grantVoucher
redemption.ts redeemCode / createBatch
index.ts     统一导出
```

`LedgerResult<T>`统一是`{success:true, data:T} | {success:false, error:string, code:string}`，`code`是给前端做错误分支用的稳定标识（如`insufficient_balance`/`code_not_found`/`already_redeemed`/`code_expired`）。

`consumeVoucher`内部会先调`consume_voucher`原子递减，再按`service_type`+`coverage_type`分流：

- `service_type='vip_subscription'` 且 `coverage_type='full'` → 调`extendVip`，`coverage_value`当天数
- 非VIP + `coverage_type='full'` → 直接跳过扣款
- 非VIP + `percentage`/`fixed_amount` → 查`service_prices`算出自付部分，调`deductWallet`（`type='voucher_partial_charge'`），并额外记一笔`type='sponsor_coverage'`的对账流水（不影响余额，只留痕，`amount`记发行方承担的那部分）
- 任何一步失败都会调`restore_voucher_use`把这次核销补偿回去

`createBatch`生成码格式`{前缀}-{8位随机大写字母数字}`，前缀是选填的（`CreateBatchInput.codePrefix?`），不填时码就是纯8位随机字符（不带前缀和横杠）。遇到唯一性冲突整批重新生成重试（最多5次）。

## 四、AI生成主流程接入（以八字为例）

**关键设计原则：进入报告页面是免费的，只有点"生成报告"按钮才会触发扣款/核销。** 这两个动作之前混在一起过（点卡片直接扣款），是一处真实的设计缺陷，已订正：

1. 点仪表盘上的`BaziReadingCard`卡片 → 无条件免费跳转到报告页（`/dashboard/assessments/bazi/reading`），不做任何扣款/余额判断。已生成过就带`?readingId=`跳，没生成过就带`?snapshotId=`跳
2. 报告页（`BaziReadingView.tsx`）在"还没生成过"这个状态下，展示：价格（`GET /api/payments/price?service_type=xxx`）、可用兑换券选择（复用补充一里的`VoucherSelector`组件，不是重新写的）、"生成报告"按钮
3. 用户点"生成报告"按钮，才调`POST /api/ai/reading`，这一步才会真正扣款/核销

`/api/ai/reading`（POST）内部逻辑本身不变：

1. 读快照/档案
2. 生成时预先分配`readingId`（`crypto.randomUUID()`），作为扣款/核销的`reference_id`
3. 请求体带`voucherId`就走`consumeVoucher`，否则查`service_prices`（`service_type='bazi_report'`）走`deductWallet`
4. 扣款/核销失败 → 直接返回402，不创建`bazi_readings`行，不触发生成
5. 成功后插入`bazi_readings`（带上`id`/`charge_type`/`charge_wallet_amount`/`charge_voucher_id`），触发`generate-phase1` Edge Function
6. 如果这一步插入失败（钱已经扣了但报告记录没建成）→ 立刻退款/归还凭证

报告页路由`/dashboard/assessments/bazi/reading`现在接受两种查询参数（互斥）：
- `?readingId=xxx` —— 报告已存在（生成中或已完成），`page.tsx`按原逻辑查`bazi_readings`
- `?snapshotId=xxx` —— 报告还没生成，`page.tsx`查`bazi_snapshots`拿命盘数据传给`BaziReadingView`，`readingId`传`null`。`BaziReadingView`的`readingId` prop因此从`string`改成了`string | null`：为`null`时不建立Supabase Realtime订阅（没有行可订阅），`hasAnyTheme`天然是`false`，直接落进"未生成"分支

**点"生成报告"失败时的提示**：`handleGenerate`之前只判断`d.readingId`存不存在，`/api/ai/reading`返回任何非2xx（余额不足402/凭证不可用402/价格未配置503/建记录失败500等）都会导致页面停在"生成中"、没有任何提示。已修正为：请求结束后先判断`res.ok`，失败时按`d.code`（`insufficient_balance`/`voucher_unavailable`）映射成对应中文提示，映射不到就退回显示后端返回的`d.error`原始信息，再退回一句通用的"生成失败，请重试"（`bazi.reading.errors.*`翻译键，目前只有zh/fr/en）。未生成过报告的按钮下方、以及已有报告要重新生成失败时的页面主区域，都能看到这条提示。

### 排查记录

**2026-08-06 · 安全漏洞：绕过扣款直接建报告记录**——用户要求排查"点按钮扣款"和"实际触发生成"是不是两条不相交的路径，排查发现是：`bazi_readings`这张表本身开着RLS，但policy允许`user_id = auth.uid()`的INSERT（这是早于这套付费系统就有的历史policy）。这意味着**任何登录用户都可以在浏览器控制台直接调用**`supabase.from('bazi_readings').insert({user_id: 自己的id, ai_reading_status: 'generating', calculation_result: ...})`**，完全跳过`/api/ai/reading`和里面的扣款逻辑**——插入的这一行五分钟后会被`reading-recovery`那个cron捡到，当成"卡住的任务"去重新触发生成，等于免费生成报告。用只读脚本实测确认了RLS会拒绝匿名/伪造user_id的插入，但没法在不登录的情况下实测"用自己真实身份插入是否会被允许"，不过按现有policy的写法（`auth.uid()=user_id`），理论上是会被允许的。

修复：
1. `/api/ai/reading`创建`bazi_readings`行、`reading-recovery`读写`bazi_readings`，两处都改成用`paymentsAdminClient`（service role），不再用session client
2. 需要去Supabase把`bazi_readings`的RLS policy收紧成**只保留SELECT**（本人可读自己的报告，不给任何角色INSERT/UPDATE/DELETE权限），这样即使有人直接调用Supabase客户端也插不进去、改不动——见下方SQL

```sql
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='bazi_readings' LOOP
    EXECUTE format('DROP POLICY %I ON public.bazi_readings', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.bazi_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bazi_readings: owner select only" ON public.bazi_readings
  FOR SELECT USING (user_id = auth.uid());
```

这段SQL会先动态找出`bazi_readings`现有的所有policy并删掉（不用你自己先去查叫什么名字），再只建一条"本人只能读"的policy。执行前确认过其余所有读`bazi_readings`的地方（资产页、档案删除前的引用检查、报告页本身、`/api/assessments/status`）都只是SELECT、且都已经用`.eq('user_id', ...)`或同等条件限定本人数据，收紧后不受影响。

**同类问题排查范围**：这次只排查了`bazi_readings`这一张表，问题的本质是"某张表的RLS policy允许客户端直接写入，而这张表的写入本该只通过后端付费逻辑发生"。`wallets`/`wallet_transactions`/`service_coverage_vouchers`这三张表已经是本次施工一开始就设计成的策略（见第二节），本身没有INSERT/UPDATE策略给`authenticated`角色，是安全的；`bazi_readings`是唯一一张"后端逻辑之外、历史上就已经开了客户端写权限"的表。以后新增付费相关的表时，默认原则应该是"客户端只给SELECT，写入一律经过后端service role"，不要假设"这张表以前的policy是安全的"。

排查时顺带发现`/api/payments/webhook`（老的Lemon Squeezy回调，依赖的表已删、当前打不通）里也有一处直接调用`/api/ai/reading`、跳过扣款逻辑的代码，已按用户决定删掉这处调用，文件其余部分（签名校验、写`purchases`表）不变，仍然是留着但跑不通的状态。

**2026-08-06 · 500报错**：用只读诊断脚本直接查生产库确认所有表、所有数据库函数都正常存在，唯独`service_prices`里没有`bazi_report`这一行。临时写入占位价格解除阻塞，并把这个分支的状态码从500改成503（"价目表还没配置"不是服务器崩溃）。

**2026-08-06 · 503报错（价格明明配置了还是报错）**：后来发现即使`/admin/prices`已经配置好价格，点卡片进去还是503。原因是查`service_prices`那几行代码误用了session client（普通登录用户权限）而不是`paymentsAdminClient`（service role）——`service_prices`没开RLS也没给`anon`/`authenticated`角色配对应的读取权限，session client查询会被静默拒绝（不报错，只是查不到行），跟后台管理接口用的不是同一套权限，导致"后台看得到、这里看不到"的不一致。已改成统一用`paymentsAdminClient`查询，这也是这类支付相关表查询的统一约定：**只要是`packages/payments`覆盖范围内的表，后端一律用service role client读写，不要用session client**，即使表面上看是个"只读查询"。

**2026-08-06 · 充值套餐页面"新增"没反应**：用只读诊断脚本发现根因是PostgREST（Supabase接口层）的表结构缓存没跟上——建表SQL在数据库里确实执行成功了，但接口层还没感知到新表存在，报"找不到这张表"，而页面当时又没做任何失败提示，表现就是"点了没反应"。跑`NOTIFY pgrst, 'reload schema';`可以手动触发刷新。这一类问题以后新建表后如果后台页面查不到数据，先怀疑这个，不要先怀疑代码逻辑。顺带把`/admin/rates`所有操作都补上了失败提示。

**2026-08-10 更新**：八字AI报告的5个Edge Function（`generate-phase1`/`theme1`/`theme2`/`theme3`/`theme4`）已用`supabase functions download`拉进本仓库（`supabase/functions/`），不再是"看不到真实代码"的黑盒，以后touch这部分直接在仓库里改、`supabase functions deploy`部署即可，不用再去Supabase控制台改。这次同时验证了`reading-recovery`重试时传给`generate-themeN`的payload字段名确实是`{ readingId, locale }`，之前"未经真实验证"的疑虑已解除。

**2026-08-11 · 真实资金损失事故排查**：用户报告两处线上问题，用`supabase db query --linked`直连生产库诊断（`cron.job`/`cron.job_run_details`/`net._http_response`这几张表记录了pg_cron的实际执行历史和每次HTTP调用的真实响应，比看代码逻辑更可靠，以后排查cron相关问题应该优先查这几张表）：

1. **定时重试从上线起就没有真正跑起来过**：`net._http_response`显示`bazi-reading-recovery`这个cron一直在按2分钟一次正常触发，但每次都收到Vercel返回的`404 DEPLOYMENT_NOT_FOUND`——8月11日Vercel项目别名从`mindo-web.vercel.app`改成`mindo-gold.vercel.app`（见CLAUDE.md"关键教训"）之后，cron的`command`里硬编码的URL没跟着改，一直打向已经不存在部署的旧域名。另外顺带发现即使域名对了也会因为cron用`net.http_post`而`/api/cron/reading-recovery/route.ts`只导出GET handler（405）而失败，这个bug从上线起就存在、因为域名问题从未被真实流量触发过所以没暴露。两个问题一起用`supabase/migrations/20260811000100_fix_reading_recovery_cron_url.sql`修掉（`ALTER JOB`改成`mindo-gold.vercel.app` + `net.http_get`），修复后`net._http_response`连续多次返回200，cron正常工作
2. **手动删除接口能绕过退款逻辑**：`DELETE /api/ai/reading/[id]`（用户报告页/资产页点"删除报告"触发）此前对任意状态的报告都直接软删除，没有判断报告是否已经生成完成（`ai_reading_status='done'`）。报告卡在生成中时如果用户手动点了删除，`deleted_at`会被设置但完全不会触发`refundWallet`/`restoreVoucherUse`，退款只有走`reading-recovery`定时任务判定彻底失败时才会发生——这是两条完全独立的代码路径，不是同一次原子操作里出了错。已修复：`deleteReading`现在先查`ai_reading_status`，非`done`直接返回`'not_done'`让接口回409，报告页/资产页的删除按钮同步只在`done`状态显示，把"删除"这个动作彻底限制在"已经不涉及任何在途扣款"的状态
3. **实际核实结果**：`wallet_transactions`/`service_coverage_vouchers`直查确认——用户损失的1张凭证`e3873516-...`（被两次生成占用又释放，`remaining_uses`已恢复）和60虚拟币（`wallet_transactions`里能看到完整的`ai_generation`扣款和`refund`补回配对，`balance_after`前后一致）在这次排查发起前就已经被系统自身的重试引擎（走的是真实的`refundWallet`/`markReadingFailedPermanent`函数，不是手工改数字）正确退回，全库扫描`deleted_at IS NOT NULL AND charge_type IS NOT NULL AND charge_refunded_at IS NULL`确认没有其余记录存在同样问题
4. **Gemini调用超时40秒→100秒**：`generationError.ts`的`callGeminiOnce`只有一处超时常量，5个Edge Function共用，不是分散在各文件各写一份。Supabase免费版Edge Function总时长上限150秒，40秒对正常但耗时较长的请求偏保守，容易把"还没失败只是慢"的请求提前打成超时失败，改成100秒，留约50秒给读取数据/解析/写库

以上代码改动+迁移文件已提交并推送到GitHub（`58a5f62`），Vercel已完成新部署且`mindo-gold.vercel.app`别名已指向新部署，Edge Function改动也已通过`supabase functions deploy`确认线上生效（5个函数`updated_at`一致，下载下来的代码确认是100秒版本）。

### `reading-recovery` cron（`/api/cron/reading-recovery`）——修过两个既有bug（历史记录）

修之前这个cron查询的是`bazi_snapshots`表的`ai_reading_status`等字段，但这些字段在`bazi_snapshots`上早就是迁移后的死字段（真正状态在`bazi_readings`上），也就是说**这个cron过去实际上从未找到过真正卡住的任务**。已改为查`bazi_readings`。

**2026-08-07 又发现一个更根本的bug**：这个路由文件当时物理上放在`api/corn/reading-recovery`（"corn"和"cron"拼错了一个字母），但`vercel.json`里配置的定时任务路径是`/api/cron/reading-recovery`——两者对不上，意味着**这个cron从一开始就没有被Vercel真正触发过**，上面那次"改成查`bazi_readings`"的修复虽然逻辑是对的，但从未真正跑起来过。已把文件夹改名成`api/cron/reading-recovery`跟`vercel.json`对齐。

**2026-08-10 重试引擎重构**：这个cron的具体设计（扫描条件/放弃阈值/退款逻辑）已被下面「重试引擎与失败分类」一节取代，30分钟放弃阈值改成了45分钟+次数上限双重判断，触发频率从Vercel每天一次改成了Supabase pg_cron每2分钟一次。

## 五、重试引擎与失败分类

八字AI报告生成是`generate-phase1`→`theme1`→`theme2`→`theme3`→`theme4`五段Edge Function接力，每段都调一次Gemini。`ai_reading_status`按阶段推进（`generating`→`phase1`→`theme1`→`theme2`→`theme3`→`theme4`→`done`），这几个中间值是Edge Function自己写的，不是本次新加的。

**2026-08-10之前的问题**：每个Edge Function内部自己对Gemini调用做多次等待重试（最长约90秒），且`fetch`没有超时保护。偶发的"连接卡死不响应"会让函数在内部无限等待，最终被Supabase平台强制终止，不留任何日志、也不触发任何失败处理逻辑。

**现在的设计**：单次调用只尝试一次（`supabase/functions/_shared/generationError.ts`的`callGeminiOnce`），Gemini的`fetch`加了40秒`AbortController`超时。失败后不再简单标记`failed_xxx`，改成按三种情况分类（`handleGenerationFailure`，5个Edge Function共用）：

1. **内容政策拦截**（Gemini返回内容安全/policy相关拒绝）：`content_policy_retry_count += 1`。小于5次：不改`ai_reading_status`（停在当前阶段），等定时任务下一轮重新触发。达到5次：写入`system_alerts`（`alert_type='content_policy_exceeded'`），设置`bazi_readings.alert_status`，不退款、不通知用户，继续保持骨架屏，等管理员在`/admin/alerts`处理
2. **API密钥失效/配额耗尽**（401/403，或错误信息含quota/key）：立即写`system_alerts`（`alert_type='api_key_invalid'`），设置`alert_status`，不计入`retry_count`，定时任务继续按正常间隔重试（万一是临时配额限制）
3. **传入数据缺失/损坏**（`draft`/前置主题字段读不到）：立即写`system_alerts`（`alert_type='data_missing'`），设置`alert_status`，不计入`retry_count`，定时任务继续重试
4. **其余技术性失败**（超时/503/429/返回内容为空/JSON解析失败/输出结构不对等）：`retry_count += 1`，不设置`alert_status`，属于正常重试范畴

三种需要管理员介入的情况都会调用`notifyAdminAlert`（`supabase/functions/_shared/alerts.ts`）——**目前只打日志，不真正发邮件**，邮件服务（如Resend）接入后只需要改这一个函数的内部实现，调用方不用动。

**`reading-recovery`定时任务**（`/api/cron/reading-recovery`，由Supabase pg_cron每2分钟触发，见下方）扫描条件：`deleted_at IS NULL AND ai_reading_status NOT IN ('done') AND ai_reading_status NOT LIKE 'failed%' AND last_attempt_at < now() - interval '2 minutes'`。对每条记录：

- `alert_status`非空：不做次数判断，直接按`ai_reading_status`重新触发对应的Edge Function（`theme1~4`直接映射`generate-themeN`，`generating`/`phase1`都从`generate-phase1`开始，它自己会判断`draft`是否已存在，是幂等的），触发成功后清空`alert_status`、把`system_alerts`里对应记录标记`resolved_at`
- `alert_status`为空：`retry_count >= 10` 或 `距first_attempt_at超过45分钟`，才算"万不得已"——按`charge_type`退款（`wallet`退全部`charge_wallet_amount`；`voucher`归还凭证使用次数，若还有自付部分也一并退），标记`ai_reading_status='failed_permanent'`，**同时自动软删除**（`deleted_at=now()`，一次DB更新完成，见下一节），不用管理员介入，这是设计内允许发生的正常兜底情况

**Supabase pg_cron触发**（迁移文件`supabase/migrations/20260810000100_reading_recovery_pg_cron.sql`）：Vercel Hobby套餐的定时任务只支持一天一次，做不到2分钟级别，改用Supabase项目自己的`pg_cron`+`pg_net`扩展，每2分钟对`https://mindo-web.vercel.app/api/cron/reading-recovery`发一次HTTP POST（带`CRON_SECRET`）。**`CRON_SECRET`没有出现在迁移文件里**——存在Supabase Vault（`vault.create_secret`，密钥名`bazi_reading_recovery_cron_secret`），迁移文件只按名字引用，避免明文密钥进git历史。`vercel.json`里原有的一天一次条目保留作为兜底，不冲突。

`/admin/alerts`（`apps/web/src/app/admin/alerts/page.tsx`）——读取`system_alerts`里`resolved_at`为空的记录，按`created_at`倒序展示`alert_type`/`reading_id`（链接到`/admin/readings/[id]`诊断详情页）/`message`/发生时间，"标记已处理"按钮设`resolved_at=now()`。**标记已处理不会让卡住的记录自动恢复重试**，那依然是`reading-recovery`定时任务在做的事，标记已处理只是关掉这条警报本身。

## 六、软删除与档案隔离

**问题**：查询"这个档案当前报告"的地方（`getLatestReadingSummary`，按`profile_id`取最新一条），之前不过滤任何"这条记录是不是已经作废"的条件——一次生成失败但已经产出部分主题的报告，会被永久当成"这个档案现在的报告"，档案再也走不到重新生成的入口。另外，真正触发扣款+生成的`/api/ai/reading`此前完全没有服务端校验，只靠前端隐藏"生成"按钮防误触，理论上可以绕过前端对同一个档案重复扣费生成。

**修复**：

1. `bazi_readings.deleted_at`非空即视为"已删除"——报告是付费凭证，不物理清除，只打标记。删除后这条记录：不再出现在"已购报告"列表（`GET /api/account/assets`）、不再被`getLatestReadingSummary`当成"当前报告"、直接访问`?readingId=`也会跳转回未生成状态（`reading/page.tsx`的查询也加了`deleted_at IS NULL`过滤）
2. `/api/ai/reading`（POST）在扣款前新增服务端校验：该`profile_id`若已有未软删除的报告（不论生成中还是已完成），直接返回409拒绝，堵住绕过前端重复扣费的路径
3. 新增`DELETE /api/ai/reading/[id]`，用户可在报告页TopBar和"已购报告"列表手动删除自己的报告，删除后档案立即恢复成可重新生成的状态
4. **走到"重试次数/时间双双超限，判定彻底失败"这一步的记录，不需要用户手动删除**——系统在完成退款的同时自动软删除（见上一节`markReadingFailedPermanent`），档案立即恢复
5. "出生信息已修改→重新生成"这个已有流程，因为第2点新加的服务端校验会拒绝对已有报告的档案重复生成，改成先`DELETE`旧报告再触发生成，不是直接生成

**页面渲染**：`BaziReadingView.tsx`不再用本地`generating`状态，完全由`ai_reading_status`驱动——空值→价格/生成按钮；`'done'`→完整报告；其余非空值（不管卡在`phase1`还是`theme1~4`哪一段）→骨架屏，已经到手的主题正常渲染，没到的部分用灰色矩形块占位（`BaziReadingSkeleton.tsx`，纯CSS，`hsl(var(--muted))`系变量跟随明暗主题，不含文案）。不会出现面向用户的失败态文案——失败到底的记录会被自动退款+软删除，页面直接查不到，回到"还没有报告"分支。

## 七、`/admin` 后台管理面板

**鉴权机制（2026-08-14起，全站后台统一）**：不带locale前缀，走独立的后台人员账号体系（`public.admin`表，跟`public.users`彻底分开，不是内容库专属——内容库/兑换码批次/直接发放/价目表/充值套餐/用户账本查询/重试警报全部后台功能共用这一套，不再有"内容库一套、支付后台另一套"两套并存的登录方式）。详细设计（表结构、登录页、建账号脚本、两层权限判断）见`Mindo-内容库.md`十二、十三节——那边是这套机制最早落地的地方，这里不重复展开。

分三层拦截：`proxy.ts`（中间件层，只负责刷新session、放行到应用层，不做"是不是后台人员"判断）→ `/admin/(protected)/layout.tsx`（页面层，`requireStaffAccount()`判断是不是`public.admin`里的人，不是则跳转`/admin/login`；这层用route group跟`/admin/login`本身分开，避免未登录时redirect死循环）→ 每个`/api/admin/*`接口内部也用`requireStaffAccount()`再判断一次，双重保险。内容库（`/admin/codex`）在这三层之上还有自己的`requireCodexAdmin()`做"能管哪些分类"的范围判断，其他后台页面没有这一层（没有分类权限颗粒度这个概念）。

登录页`/admin/login`，纯账号+密码（不接magic link/验证码/第三方OAuth），账号只能靠`apps/web/scripts/create-admin-account.mjs`脚本手动创建，不接公开注册。**这套机制曾经短暂改回`ADMIN_EMAILS`环境变量白名单（2026-08-13当天），当天又改了回来**——`.env.local`里的`ADMIN_EMAILS`这个键目前没有任何代码在读，是历史遗留，没有删除这个环境变量本身，纯粹是代码不再引用。

页面（纯内部工具，不接入next-intl多语言，符合原方案要求）：

- `/admin/batches` — 生成兑换码批次（表单）+ 批次列表（含已核销/总数）。表单结构：类型（兑换券/虚拟币/VIP时长，第一个字段，决定后面展示哪些字段）→ 前缀（选填）/生成张数/过期时间（选填，共用）→ 各类型专属字段。不再有"备注"字段
- `/admin/batches/[id]` — 批次详情 + 导出未使用兑换码CSV（`/api/admin/batches/[id]/export`）
- `/admin/grant` — 直接发放（**用户handle**，不是邮箱 + 虚拟币/VIP天数/兑换券三选一）。handle输入框带搜索自动补全，复用私信模块"加好友"同一套`/api/users/search`接口和交互（`components/admin/HandleSearchInput.tsx`），只是这个场景要能搜到管理员自己（方便给自己账号发测试额度），接口加了`excludeSelf`参数区分两种调用场景，私信模块那边的调用没改。选"兑换券"时的"兑换性质/折扣数值字段名随类型变化/可用次数"这部分，跟`/admin/batches`表单是同一套实现逻辑（字段名：百分比折扣→"折扣百分比"，定额抵扣→"抵扣虚拟币数"，全免则不显示这个字段），两处的`discountValueLabel`计算逻辑完全一致，不是各自维护一份。这个入口不采集"发行方标签"——发行方必然是管理员自己，提交时这一列留空（`/admin/batches`那边的发行方标签字段不受影响，仍然保留）
- `/admin/prices` — `service_prices`增删改，项目用下拉选（来源`ADMIN_SERVICE_TYPES`），不再手打`service_type`
- `/admin/rates` — 充值套餐管理，`wallet_topup_tiers`增删档位（虚拟币数量/排序/是否上架）+ 每个档位下`wallet_topup_tier_prices`的多货币定价（增删改）
- `/admin/users` — 用户账本只读查询（按邮箱查，余额/VIP状态/持有的凭证列表，不再显示`vip_tier`）
- `/admin/alerts` — 八字报告重试引擎的警报列表，见「重试引擎与失败分类」一节
- `/admin/readings/[id]` — 单条`bazi_readings`记录的诊断详情（状态/重试计数/扣退款情况等只读展示），从`/admin/alerts`的`reading_id`链接跳转过来，不单独在导航里出现

对应接口都在`apps/web/src/app/api/admin/`下，统一用`paymentsAdminClient`（service role）或`baziRepositoryAdmin`（八字相关），不依赖RLS。`/admin/tiers`、`/admin/tiers/[id]`、`/admin/tiers/[id]/prices`、`/admin/tiers/[id]/prices/[currencyCode]`是充值套餐对应的接口。

任何后台页面要展示或选择"服务类型"，一律用下拉，选项和显示文字来自`apps/web/src/config/adminServiceTypes.ts`的`ADMIN_SERVICE_TYPES`（组合`assessments.ts`的`ASSESSMENTS`列表和`messages/zh/assessments/index.json`的中文名，只列`isAvailable`的模块），界面上不会出现`bazi_report`这类原始字符串。以后新增测算模块上线后，这几个下拉自动跟着多一项，不需要在各个后台页面里分别手动维护。

后台中文文案里的"虚拟币"三个字统一从`apps/web/src/config/payments.ts`的`WALLET_UNIT_LABEL`引用，不允许各页面自己写一份。

## 八、前端接入点

- 个人主页（`/dashboard/profile`）新增"输入兑换码"入口（弹窗），调`POST /api/payments/redeem`
- 八字报告生成页（`BaziReadingView.tsx`）的"生成报告"/"出生信息不符→重新生成"两处场景，接入`VoucherSelector`组件（`components/payments/VoucherSelector.tsx`，自治组件，自己按`service_type`拉取当前用户可用凭证），选中的`voucherId`会带进`/api/ai/reading`请求体。`VoucherSelector`内部渲染成可点击选中的卡片（复用`components/payments/VoucherCard.tsx`），不是下拉菜单，详见第十一节
- `GET /api/payments/vouchers?service_type=xxx`——查询当前用户在某个service_type上还能用的凭证列表
- 仪表盘上的`BaziReadingCard`**只负责免费跳转到报告页**，不触发任何扣款/凭证核销（详见第四节的设计缺陷修正记录）——之前这里直接调过`/api/ai/reading`，已经去掉
- `GET /api/payments/price?service_type=xxx`——报告页展示价格用，session登录即可调，内部用`paymentsAdminClient`查`service_prices`
- `/dashboard/profile`账户信息条：用户名颜色读`vip_expires_at > now()`，是则金色（新增CSS变量`--vip-gold`，`globals.css`里浅/深色模式各定义了一份），否则默认颜色，不显示"会员/非会员"这几个字；`@handle`下方新增一行纯文字余额展示（`payment.balanceLabel`翻译键，读`GET /api/payments/assets`的`balance`字段，兑换码兑换成功后会重新拉取刷新）
- 前端所有next-intl可见文案里的"虚拟币"统一读`payment.walletUnit`这个翻译键，组件里通过`useTranslations('payment')`拿到这个词，再当参数`{unit}`传进其他翻译字符串里插值（如`voucher.coverageFixedAmount`/`assets.wallet.balance`），不允许某条翻译字符串里直接写死这个词——以后要改名字，只改`payment.walletUnit`这一条，全项目跟着变。目前`walletUnit`已加到en/zh/zh-Hant/fr四个已有`payment`命名空间的语言

## 九、资产页展示（`/dashboard/profile/assets`）

原页面只有"已购报告"一个列表。现在页面顶部加了标签切换（复用片语模块的标签交互样式）：

- **已购报告**——原有`bazi_readings`列表逻辑原样保留，不变
- **待消费资产**——新标签，新组件`components/payments/PendingAssetsTab.tsx`，展示：
  1. 虚拟币余额（`wallets.balance`，无记录显示0）
  2. VIP状态（`users.vip_expires_at`早于现在显示"非会员"，否则显示到期日期）
  3. 兑换券列表（`service_coverage_vouchers`里`remaining_uses>0`的记录，归零后自动从列表消失，不做"已用完"的灰色态）
  4. 兑换码输入框，提交成功后整页重新拉取（不做局部更新）

数据来源是新增的`GET /api/payments/assets`（返回`{balance, vipExpiresAt, vouchers}`，一次性取齐三块，方便兑换后统一刷新），兑换本身复用已有的`POST /api/payments/redeem`，没有新建兑换接口。

兑换券卡片上的服务名称，通过`src/config/assessments.ts`新增的`getAssessmentByServiceType(serviceType)`（把`'bazi_report'`这类命名去掉`_report`后缀映射回`'bazi'`）读取`assessments`命名空间里已有的多语言名称，没有新建服务名称的翻译键。

新增了独立的翻译模块目录`messages/{locale}/assets/index.json`（目前只有en/zh两种语言，已在`src/i18n/request.ts`的`loadMessages()`里注册），装标签名、余额/VIP/兑换券相关的展示文案；兑换码输入框本身复用了此前已建好的`payment.redeem.*`翻译键，没有重复建一套。

个人主页（`/dashboard/profile`）的"输入兑换码"入口维持不变，两处入口调的是同一个后端接口，可以理解为对同一个功能的两个入口，不是重复建设。

## 十、兑换券卡片组件 + 报告页弹窗式生成流程 + 骨架屏提示条

体验层补充施工（不涉及资金安全逻辑改动，扣款/核销/退款的后端逻辑跟第四、五节描述的完全一样，这次只改前端交互）。

### 兑换券卡片组件抽取

`components/payments/VoucherCard.tsx`：新增的纯展示组件，`voucher`+可选的`onClick`/`selected`/`showServiceName`几个prop。`onClick`存在时渲染成可点击选中的卡片（边框高亮表示选中态），不存在时是资产页那种纯展示卡片——**这是资产页"待消费资产"标签和报告页兑换券选择这两处唯一的卡片实现**，样式改动以后只用改这一个文件。

- `PendingAssetsTab.tsx`（资产页）：原来内联写的卡片JSX已删除，改成 `<VoucherCard voucher={v} />`（不传onClick/selected，纯展示，`showServiceName`保持默认true——资产页要看清楚是哪个测算模块的凭证）
- `VoucherSelector.tsx`（报告页，见下）：不再是`<select>`下拉菜单，改成渲染一列`<VoucherCard voucher={v} selected={...} onClick={...} showServiceName={false} />`（`showServiceName=false`——报告页的service_type就是页面本身的上下文，卡片上不用再重复显示"八字报告"这几个字）。`onChange`的函数签名从`(voucherId: string | null) => void`改成`(voucher: Voucher | null) => void`，把完整的凭证对象交给调用方（报告页要在确认弹窗里展示选中凭证的详情，光有id不够）。再次点击已选中的卡片会取消选择（`voucherId`回到`null`，即改回虚拟币支付），卡片列表里没有单独的"不使用凭证"选项
- 翻译键跟着合并：删掉了`payment.voucher.none/full/percentage/fixedAmount`（连issuer信息都不显示了，这几个key的措辞已经不适用），改成`payment.voucher.coverageFull/coveragePercentage/coverageFixedAmount/remainingUses`——这组新key同时也是原来`assets.vouchers.coverageFull`等几个key的搬家目的地（`assets/index.json`里对应几个key已删除，`assets.vouchers`现在只剩`title`/`empty`两个跟凭证展示无关的key）。`payment.voucher`覆盖en/zh/zh-Hant/fr四个语言（沿用`payment`命名空间原有的语言覆盖范围，没有扩大也没有缩小）

### 报告页：弹窗式生成确认流程

`BaziReadingView.tsx`点"生成报告"按钮（虚拟币或选中某张兑换券卡片，走的是同一个按钮）不再直接发起请求，而是先弹出确认弹窗，状态机（`modalStage: 'confirm' | 'loading' | 'success' | 'error' | null`，同一个弹窗组件`GenerateConfirmModal`内部按这个状态切换展示内容，不是四个不同弹窗）：

```
confirm（弹窗内容：价格或选中的兑换券卡片 + "预计3-15分钟"提示 + [取消][确认生成]）
  → 点确认生成 → loading（转圈）
    → 请求成功 → success（"已经开始生成，回来看就有了" + [好的]）
      → 点好的 → 关闭弹窗，这一刻才真正把readingId/ai_reading_status写进组件本地状态，
                  触发状态驱动骨架屏重新渲染——不用router.push，不整页刷新/重新拉取数据
    → 请求失败 → error（错误文案，复用原有的insufficient_balance/voucher_unavailable/
                通用错误映射逻辑） + [好的]
      → 点好的 → 关闭弹窗，页面停留在原来的价格/兑换券选择界面，不做任何状态变更
```

组件内部新增`localReadingId`状态（初始值来自`readingId` prop，之后组件自己接管），Realtime订阅和价格查询这两个原本依赖`readingId` prop的`useEffect`都改成依赖`localReadingId`。

"出生信息不符→重新生成"（`showMismatch`弹窗）这条既有流程**没有**叠加这套确认弹窗——点"重新生成"这个动作本身就是确认（那个弹窗已经在问"要不要重新生成"了），再套一层确认弹窗是重复。但这条路径也顺带改成了跟主流程一致的本地状态更新（不再是旧`handleGenerate`内部的`router.push`），两条路径现在共用同一个不做任何副作用的`submitGenerate()`函数（只管发请求拿结果，不管拿到结果之后弹窗/页面状态怎么变），各自决定成功后怎么处理。

### 骨架屏顶部悬浮提示条

报告处于生成中状态（`hasStarted && !isDone`）时，页面顶部（`fixed top-14`，TopBar下方）悬浮一条小字提示，内容是`reading.generatingBanner`翻译键（"预计需要3-15分钟，可以先离开，回来看就有了"）。持续显示不自动消失，轻量样式（`text-xs`+`muted-foreground`色，浅色半透明背景`hsl(var(--background)/0.92)`保证在骨架屏灰色块上还能看清字），允许压住下面骨架屏内容的一部分。

**技术债（待补）**：无论是弹窗里的"已经开始生成"文案，还是这条悬浮提示条，都刻意没有承诺"完成后我们会通知你"——这次没有做站内消息中心，写这句话会是个兑现不了的承诺。等消息中心做出来之后，把这两处文案换成真正的通知承诺（弹窗成功态`reading.confirmModal.started`、悬浮条`reading.generatingBanner`这两个翻译键，届时en/zh/fr三个语言都要一起改）。

## 十一、待办

- [ ] Lemon Squeezy的`/api/payments/checkout`、`/api/payments/webhook`当前会直接报错（依赖表已删），用户决定暂时保留、以后再单独决定去留
- [ ] `service_prices`里`bazi_report`的价格是不是已经是真实价格了，去`/admin/prices`确认一下（排查过程中发现被改成了5，不确定是不是有意调的测试值）
- [ ] `notifyAdminAlert`（`supabase/functions/_shared/alerts.ts`）目前只打日志，没有真正接入邮件服务，管理员需要主动去`/admin/alerts`看才知道有警报
- [ ] 本次重试引擎重构（三分类失败处理/骨架屏/软删除）的完整端到端流程——真实发起生成、中途刷新页面确认骨架屏、故意改错API key触发告警——仍未做过真实的正向生成流程测试，只验证过失败/退款分支（见下方2026-08-11排查记录）。建议找机会走一遍正向生成场景
- [ ] 充值套餐（`wallet_topup_tiers`/`wallet_topup_tier_prices`）目前只有后台维护界面，还没有真实支付渠道能触发充值——现阶段只能靠兑换码入账，也还没有前台充值页面（本轮要求只做对后台，不需要另建前台充值页）
- [ ] `payment`翻译命名空间目前只有en/zh/zh-Hant/fr四种语言完整，de/es/ja/ko/it缺失（含`voucher`/`redeem`/`walletUnit`），这是延续已有的缺口，不是本次新引入的
- [ ] 新增的`assets`翻译模块目录目前只有en/zh两种语言，其余7种待补齐（按施工说明文档的要求，不阻塞本次完成）
- [ ] VIP的`percentage`/`fixed_amount`覆盖类型逻辑仍未实现（等VIP购买流程真的存在了再接），资产页兑换券列表遇到这类记录目前只是按现有规则原样展示，不做特殊处理
- [ ] `redemption_codes.status`的`'expired'`目前只在`/admin/batches/[id]`详情页做展示层现算，数据库里过期未用的码仍然是`'unused'`，没有定时任务把它真正写成`'expired'`——如果以后有报表/导出需要直接信任数据库里的`status`字段，需要另外补一个定时任务
- [ ] 排查过程中顺带发现：`messages/{locale}/bazi/index.json`的`reading`这个嵌套对象（八字AI报告页几乎所有文案，tab名/章节标题/生成按钮/出生信息不符提示等）**只有zh、fr、en三种语言有**（en只有`priceLabel`/`generatingBanner`/`confirmModal`/`errors`这几个跟支付/生成流程相关的键，tab名/章节标题等大部分内容仍然缺失），zh-Hant/es/ja/ko/it/de这6种语言完全没有这个对象，报告页对这些语言的用户来说文案基本是缺失状态——这是本次施工之前就存在的缺口，不是本次引入的，但影响面比较大，建议找机会单独补齐。`reading.priceLabel`此前只有en有、zh和fr漏了（导致这两个语言的用户在报告页看到的是键名本身而不是价格文案），本次已经补上；弹窗式生成流程新增的`confirmModal`/`generatingBanner`延续同一个"只做zh/en/fr"的范围，没有借机会扩大到其余6种语言
- [ ] 弹窗式生成流程+骨架屏提示条+兑换券卡片化这次只做到类型检查通过、全部相关路由在dev server编译无报错，没有用真实登录账号走一遍完整交互（确认弹窗四个状态切换/骨架屏悬浮条实际展示效果/卡片选中态样式），建议找机会用测试账号实测一遍
- [ ] "生成完成后回来看就有了"这类文案（弹窗成功态`reading.confirmModal.started`、骨架屏悬浮条`reading.generatingBanner`）刻意没有承诺"会主动通知你"，因为站内消息中心还没做——等消息中心做出来后要回来把这两处文案换成真正的通知承诺，见第十节
- [ ] Supabase新建表之后，PostgREST的表结构缓存不会立刻感知到，直接通过接口查/写新表会报"找不到这张表"（`PGRST205`）——踩过一次坑，以后新建表后如果代码报"表不存在"但SQL Editor里看这张表明明存在，先去SQL Editor跑`NOTIFY pgrst, 'reload schema';`，不要先怀疑代码逻辑

## 十二、Pro账号模式

2026-08-21新增，为「先天体质」模块（面向持证中医师的辅助工具，详见`Mindo-先天体质.md`）铺垫的账号权限层。与VIP完全解耦，两套字段互不影响判断逻辑，架构上是VIP的同构复刻。

### 12.1 数据库

```
users.pro_expires_at        新增字段，与vip_expires_at同结构，
                             判断逻辑同VIP：pro_expires_at > now()视为有效

pro_transactions            新增表，结构对齐vip_transactions：
                             id, user_id, days_delta, expires_at_after, type, actor_id
                             type枚举：'redeem'/'admin_grant'/'admin_revoke'
                             （比vip_transactions少一个'voucher_full'——Pro目前没有
                             凭证触发续期的路径，只有兑换码直接reward_type='pro'和
                             管理员直接发放两种入账方式）

extend_pro()                 新增数据库函数，逻辑对齐extend_vip：
                              GREATEST(当前pro_expires_at, now()) + days
```

迁移文件：`supabase/migrations/20260821000000_pro_account_mode.sql`。`redemption_code_batches.reward_type`是`text`列（代码层`RewardType`联合类型校验，非数据库枚举/CHECK约束），加`'pro'`不需要额外SQL，已用诊断查询确认过。

`pro_transactions`不开RLS给`authenticated`角色任何策略，只被service role写入，跟`vip_transactions`同等对待。

### 12.2 代码层（`packages/db`/`packages/payments`）

完全镜像VIP那一套，一一对应：

```
packages/db/src/payments/interface.ts      RewardType加'pro'；ProTransactionType；
                                             PaymentsRepository加extendProRaw/getUserProExpiry
packages/db/src/payments/supabaseRepository.ts   对应Supabase实现，RPC名extend_pro
packages/payments/src/pro.ts                extendPro() / checkProActive()，镜像vip.ts
packages/payments/src/redemption.ts         redeemCode()里rewardType==='pro'分支，
                                             逻辑与'vip'分支完全一致
```

### 12.3 后台管理面板

- `/admin/batches`——类型下拉加"Pro时长"，与"VIP时长"并列，字段结构（天数输入）照抄VIP分支
- `/admin/grant`——直接发放由三选一扩展为四选一，新增"Pro天数"
- `/admin/users`——用户账本查询展示字段新增Pro状态一行，读取/展示逻辑对齐VIP那一行

### 12.4 前端接入点

- `GET /api/payments/assets`返回体新增`proExpiresAt`字段，取法与`vipExpiresAt`一致
- 测算中心页面（`[locale]/dashboard/(os)/assessments/page.tsx`）TopBar右侧新增条件渲染入口：`pro_expires_at > now()`时展示一个写着"PRO"的文字按钮（复用`payment-assets`这个TanStack Query缓存键，不额外发请求），点击跳转`/dashboard/assessments/pro`——这是一个新的Pro工具入口页（Pro Hub），视觉/卡片网格完全复用测算中心主页那一套，里面每张卡片对应一个Pro工具（目前只有先天体质一项），不是直接跳去某个具体工具
- **不做**个人主页视觉标注（不做金色用户名类似处理），这是产品决策，仅体现为顶边栏入口的显隐——这一点跟VIP的"账户信息条用户名变金色"故意不同，不要混淆抄错

### 12.5 与VIP的已知差异

- Pro没有`percentage`/`fixed_amount`覆盖类型逻辑（VIP也还没实现，见十一节待办），也没有凭证触发续期的路径——目前只有兑换码和管理员直接发放两种入账方式
- Pro没有账户信息条金色用户名这类视觉标注（VIP有），见12.4
