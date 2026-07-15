# Mindo — 项目记忆文件

## 项目简介

全球化赛博玄学Web App，集命理测算、心理测量、社区论坛、社交匹配、周边商城于一体。

- 生产环境URL：https://mindo-web.vercel.app
- GitHub仓库：https://github.com/heiyi98/Mindo
- 本地路径：E:\destinos

## 当前技术栈

- Monorepo工具：pnpm workspace + Turborepo
- 前端：Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion
- 国际化：next-intl 4.x
- 数据库：Supabase（PostgreSQL + RLS）
- 图标：lucide-react（部分模块使用自定义SVG图标）
- 部署：Vercel（国际版）/ 阿里云（中国版，待定）
- 开发环境：Windows PowerShell 5.x，Claude Code

## Monorepo结构

```
apps/web/          ← Next.js前端主应用
packages/core/     ← 命理+心理计算引擎（纯逻辑，无UI依赖）
packages/db/       ← 数据库schema和Supabase客户端
packages/ui/       ← 共享UI组件库
packages/config/   ← 共享TypeScript/ESLint配置

```

## 组件架构（铁律）

### 卡片系统

每张卡片是独立自治组件，放在任何页面行为完全一致：

- 接收唯一prop：`profileId: string`，自己fetch数据，自己处理loading
- 导出 `COLS`、`ROWS`、`CARD_META`（尺寸规格，6列网格单位）
- 切换profileId时先清空state再fetch，防止旧数据残留
- 视觉内容用SVG（viewBox比例依据COLS/ROWS，width/height=100%）
- viewBox宽度固定500，高度=500×(ROWS/COLS)

### 文件结构

```
components/
  dashboard/         ← 导航框架层（ProfileSwitcher, ProfileEditModal）
  modules/           ← 功能模块卡片（assessments/ 路由下）
    bazi/
      BaziChartCard.tsx       COLS=4 ROWS=2（展开藏干/十神切换/中文映射）
      WuxingRadarCard.tsx     COLS=2 ROWS=2
      DayMasterCard.tsx       COLS=2 ROWS=3
      BaziReadingCard.tsx     COLS=1 ROWS=2（路由用 @/i18n/navigation，跳转 assessments/bazi/reading）
      BaziReadingView.tsx     ← AI报告长页滚动视图（路由用 @/i18n/navigation，返回按钮=router.back()）
      BaziReadingChart.tsx    ← 报告页命盘SVG组件（三种模式）
    bigfive/
      BigFiveChart.tsx        COLS=2 ROWS=2（双击弹窗modal）
    western/
      StarChartWheel.tsx      COLS=3 ROWS=3
  common/            ← 通用卡片
    ProfileCard.tsx           COLS=2 ROWS=1（SVG渲染，文字等比缩放；分钟未知不再有特殊显示分支，见下方"真太阳时显示规则"）
    ValveLogo.tsx             ← 阀门动画logo，单侧渲染，side='left'|'right'，isOpen控制展开/闭合
    ValveConverge.tsx         ← 复用ValveLogo开关状态机，direction='open'|'close'，用于teaser页汇合动画和onboarding入场动画
    MindoMark.tsx             ← 静态完整logo，用于Dock等导航场景（不参与动画）
  os/
    Dock.tsx                  ← 左侧导航栏，key/href已从divination改为assessments；profile图标用lucide的User（不是SquareUser）；悬停显示模块名，用现成的'nav'翻译命名空间（不是新建的'dock'）
    LanguageSwitcher.tsx      ← 导出两个组件：LanguageSwitcher（落地页/onboarding用，Globe图标）和LanguageSettingRow（profile页用，已改成Languages图标）——两者图标故意不同，不要统一
  theme/
    ThemeProvider.tsx         ← 全局主题Context（light/dark/system）
    ThemeToggle.tsx           ← 三段式主题切换组件
config/
  dashboard-widgets.ts  ← 卡片注册表（WIDGET_REGISTRY/DEFAULT_LAYOUT/repackLayout）
contexts/
  GridContext.tsx       ← 卡片展开信号桥接（expandCard/collapseCard/expandedCards）

```

**注意**：`PostOnboardingRevealContext.tsx`、`PostOnboardingReveal.tsx` 曾经存在（注册成功后logo飞入Dock的动画），**已被产品决策彻底移除**——注册成功后直接呈现仪表盘，不再播放过渡动画。不要重新创建这两个文件或恢复相关引用。

### 页面布局规范

所有模块页面统一规范：

- 容器：`max-w-xl mx-auto`（576px），`px-4 py-6`
- ref挂外层div，ResizeObserver计算cellSize
- cellSize公式：`Math.min(w - 32, 576)`，4列

### 仪表盘

- 6列CSS Grid，格子正方形（cellSize = (容器宽 - 5×16) / 6）
- 拖拽：useDraggable + useDroppable，onDragMove实时计算hoverCell
- 落下时碰撞解决：被拖卡片优先，冲突卡片按左上角优先排序找空位，允许空位
- 半透明高亮（整块虚线框，zIndex:30）显示落点预览
- 布局持久化：users.dashboard_layout JSONB
- 编辑模式：右侧264px抽屉，主区域paddingRight让出空间

### GridContext展开系统

- 卡片调用 `expandCard(id, extraRows)` 通知容器
- 容器监听 `expandedCards`，动态调整gridRow的span
- 被展开卡片x范围内且在其下方的卡片row后移
- x不重叠的卡片坐标不变（锚定原始位置）
- 无Provider时静默失败，卡片正常渲染

### 档案管理页面（profiles/page.tsx）

- 拖拽排序：`@dnd-kit/core` + `@dnd-kit/sortable`，静默保存（PATCH order_index，不需要用户手动确认）
- 账户本人档案（is_self）永远锁在最顶端，不参与排序
- 出生时间显示：分钟是否已知不再影响前端展示，统一按 `substring(0, 5)` 截取显示，不再有"(未知分钟)"这类行内标注（详见下方"真太阳时显示规则"）

## 多语言规则（铁律，不得违反）

1. 任何组件里禁止出现硬编码的中文或英文用户可见字符串
2. 所有文字必须通过 useTranslations() 或 getTranslations() 读取
3. 翻译文件结构：apps/web/messages/{locale}/ui.json（基础UI）+ 模块子目录
  - messages/{locale}/bazi/index.json（八字命盘，含tiangan/dizhi/shishen词典）
  - messages/{locale}/bigfive/index.json（大五主体）
  - messages/{locale}/bigfive/questions.json（120道题目）
  - messages/{locale}/western/index.json（西洋星盘）
  - messages/{locale}/assessments/index.json（测算中心页面自己的词典，跟ui.json里旧的divination对象已经脱钩）
4. 当前支持语言：en（默认）、zh（简体）、zh-Hant（繁体）、fr、es、ja、ko、it、de
5. 新增功能时必须同步更新所有语言文件，至少en和zh必须完整
6. `nav` 命名空间（ui.json里）：home/assessments/forum/shop/messages/profile，Dock悬停提示复用这个，不要新建重复的命名空间
7. **待办**：`onboarding.timePicker.unknownMinute` 这个键目前ui.json里没有正式收录，靠代码里的`defaultMessage`兜底撑着，需要用户自己补上
8. **繁体中文字体地区决策**：`zh-Hant` 涉及字体渲染时，统一使用 Source Han Sans/Serif 的 **TW（台湾）子集**（Fontsource 包为 `@fontsource/noto-sans-tc`），不使用 HK（香港）子集。这条目前只约束"字体文件选哪个"，不代表对 `zh-Hant` 地区语义做了更广泛的重新定义

## 路由结构

```
/{locale}/                              → 落地页
/{locale}/dashboard/                    → 仪表盘主页（6列网格，可自定义）
/{locale}/dashboard/assessments/         → 测算中心（原divination，已全局改名）
/{locale}/dashboard/assessments/bazi/   → 八字主页
/{locale}/dashboard/assessments/bigfive/ → 大五人格
/{locale}/dashboard/assessments/western/ → 西洋星盘
/{locale}/dashboard/assessments/bazi/reading → 八字AI报告长页（?readingId=...）
  ⚠️ 物理位置在 dashboard/assessments/bazi/reading/page.tsx，
     不在 dashboard/(os)/ 路由组底下——故意搬出去的，
     这样它不会继承(os)/layout.tsx里的Dock，避免报告页出现导航栏。
     旧位置 dashboard/(os)/assessments/bazi/reading/ 已删除。
/{locale}/dashboard/profile/            → 账户管理
/{locale}/dashboard/profile/profiles/  → 档案管理（拖拽排序）
/{locale}/dashboard/profile/assets/    → 资产管理（所有付费报告）
/{locale}/dashboard/profile/account/  → 账户安全
/{locale}/dashboard/forum/             → 论坛（待开发）
/{locale}/dashboard/shop/              → 商城（待开发）
/{locale}/dashboard/messages/          → 私信（待开发）
/{locale}/onboarding/                  → 引导流程
/{locale}/auth/login/                  → 登录页
/{locale}/auth/set-password/           → 新用户注册后设置密码
/{locale}/auth/reset-password/         → 忘记密码后重置密码

```

`(os)` **路由组说明**：括号目录不影响网址，只影响"继承哪个layout"。`(os)`底下的页面共用同一个layout.tsx（含Dock+TopBar）。任何不该有导航栏的独立页面（比如报告页），应该放在`(os)`外面，会自动跳过这层布局、直接继承根布局。这是路由组的标准用法，不是bug。

## 架构铁律

1. 模块完全解耦：任何单一模块的修改不得影响其他模块
2. AI调用必须走后端API路由，禁止在前端暴露任何Prompt
3. 所有颜色和间距必须引用设计系统变量，禁止硬编码
4. 计算结果必须存为快照，禁止重复触发计算
5. packages/core 禁止引入任何前端框架依赖
6. 新增数据库字段必须先执行SQL再写代码
7. 卡片组件不得有固定像素尺寸，只能有SVG viewBox和百分比
8. 含中文的文件禁止用PowerShell -replace修改，必须发给Claude输出后替换
9. **架构级改名/重构必须搭配全项目搜索核查**：任何时候重命名文件夹、导出符号、路由路径，必须全局搜索所有引用点确认零残留，再收尾——这次连续踩过好几次"改名漏改角落"的坑（Dock跳转、报告卡片跳转、资产页跳转全部各自独立漏改过一次），不是哪个工具或哪次会话特别不可靠，是这类操作本身的通病

## packages/core 目录结构（已锁定）

```
packages/core/src/
├── bazi/
│   ├── constants.ts   ← 所有静态数据表
│   ├── utils.ts       ← calcShiShen / isAdjacent 等共享工具
│   ├── engine.ts      ← 排盘引擎，baziEngine.calculate() 参数类型直接
│   │                     import type { UniversalTimeResult } from '../time'
│   │                     不再自己手写一份重复类型（防止两边字段改名不同步）
│   ├── analysis.ts    ← 七步分析引擎
│   ├── pattern.ts     ← 格局判定
│   ├── yongshen.ts    ← 五行全局评估（computeWuxingAssessment）
│   ├── preparePhase1Input.ts ← AI解读第一阶段输入准备
│   ├── fortune.ts     ← 大运流年运势计算
│   ├── timeline.ts    ← 大运流年
│   └── types.ts       ← 全部类型定义
└── time/              ← 通用时间模块（从bazi/engine.ts里拆出来，紫微/星盘等
                          未来模块共用同一套时间基准，禁止在各模块内部重写）
    ├── engine.ts      ← calculateUniversalTime()，真太阳时/地理时区双模式计算
    ├── timezones.ts   ← getAdministrativeTimezone()，全球行政时区映射字典
    └── index.ts       ← export * from './engine' + './timezones'

```

### 时间引擎（packages/core/src/time/engine.ts）

```typescript
calculateUniversalTime(input: TimeInput): UniversalTimeResult

```

- `minuteUnknown: false`（分钟已知）→ 精确经度平移（lng×4）+ Spencer均时差公式，逐分钟精确计算
- `minuteUnknown: true`（分钟未知）→ 地理时区整点平移（`Math.round(lng/15)*60`），跳过均时差修正，不装虚假精度
- 已端到端验证：`time/engine.ts` 算出的 `solarTimeStr` 会经 `bazi/engine.ts`（原样透传进 `meta.solar_time`，不做二次计算）一路传到前端，链路干净，没有被任何环节污染或重复计算
- `UniversalTimeResult` 是这个模块导出的唯一权威类型，`bazi/engine.ts` 直接引用它，不要手写重复类型

### 真太阳时显示规则（产品决策，覆盖了Gemini此前的设计）

- **前端永远只显示"真太阳时"，不区分分钟是否已知**——不管后端走的是精确算法还是行政时区偏移算法，用户看到的都是统一的"真太阳时：HH:MM"，不再有"地方时区：约X时"这种暴露精度差异的措辞
- 分钟未知时数据库存的是 `HH:00`，前端直接按标准格式截取显示即可，不需要任何特殊分支
- 涉及文件：`ProfileCard.tsx`、`profiles/page.tsx`——两处的 `is_minute_unknown` 分支判断已删除
- `ProfileEditModal.tsx`/`TimePicker.tsx` 不受影响，本来就是对的（分钟下拉框留空=不知道分钟）

## 八字算法核心参数（已锁定，修改须经架构讨论）

### 藏干基础分（静态，来自传统藏气比例）

```
子：癸30 | 丑：己18/癸9/辛3 | 寅：甲16/丙7/戊7
卯：乙30 | 辰：戊18/乙9/癸3 | 巳：丙16/庚7/戊7
午：丁21/己9 | 未：己18/丁9/乙3 | 申：庚16/壬7/戊7
酉：辛30 | 戌：戊18/辛9/丁3 | 亥：壬21/甲9

```

### 月令系数（斐波那契数列×0.25）

```
得令（同五行）    ×2.00   （0.25×8）
近旺（月令所生）  ×1.25   （0.25×5）
泄气（生助月令）  ×0.75   （0.25×3）
受制（月令所克）  ×0.50   （0.25×2）
失令（克制月令）  ×0.25   （0.25×1）

```

### 天干五合（步骤0）

真化三条件（同时满足）：

1. 两干宫位相邻（年月 / 月日 / 日时）
2. 月令生助化神五行
3. 全局所有天干中，无任何一干的五行克化神五行

真化→双干改写为化神五行；否则→合绊（双干 outputEnabled=false）。

### 透根系数（步骤1）

```
单根透根系数 = 藏干基础分 ÷ 10
总透根系数   = 所有根的系数之和（无上限）

```

设计依据：以比肩为基准单位1。墓库本气（≈18）÷10≈1.8，符合"1比肩<1墓库气"； 余气（≈7）÷10≈0.7，2个比肩<1余气；纯气（30）÷10=3，3比肩<1长生纯气。

### 独立能量（步骤4）

```
天干能量 = 30 × 月令系数 × (1 + 总透根系数)
藏干能量 = 基础分 × 月令系数

```

### 合绊 / 墓库（步骤5）

- 合绊：outputEnabled=false，日干例外（始终输出）
- 墓库：仅土支（辰戌丑未）。有藏干透出→正常输出；无透出→锁闭（MuKuLocked）。六冲开库（辰戌互冲/丑未互冲）。

### 宫位权重（步骤6）

**已废弃**。当前 influence = energy，无位置权重。未找到合理系数逻辑，待后续设计。

### 用神算法（yongshen.ts / computeWuxingAssessment）

**分组**（以日主为基准）：

```
A = 印星（生我）   B = 比劫+日主（同我）   C = 食伤（我生）
D = 财星（我克）   E = 官杀（克我）

H（扶我方）= A + B
K（耗我方）= C + D + E
baseScore  = |H - K|

```

**链式反应系数**（注入30点某五行X时）：

```
X本身        +30 × 1.0  （基准）
X生者（子）  +30 × 0.8  （接收生气，递减0.2）
X被生者（母）-30 × 0.2  （生出去的消耗）
X所克者      -30 × 0.6  （隔1位克，贪生忘克：0.6<0.8）
克X者        -30 × 0.3  （逆向消耗；3次被克克方合计-1.2，符合反侮）

```

五行相生顺序：A→B→C→D→E→A（印生比，比生食，食生财，财生官，官生印）。 三会局五行免疫被克效果（旺神不可克）。

**分级阈值**（均相对 baseScore）：

```
|effect| < baseScore × 10%  → 闲神（无命理依据，设计决策）
|effect| ≥ baseScore × 50%  → 强用神 / 强忌神
|effect| < baseScore × 50%  → 弱用神 / 弱忌神
effect最大的用神             → 关键用神

```

**WuxingStrengthLabel 枚举**： `'关键用神' | '强用神' | '弱用神' | '闲神' | '弱忌神' | '强忌神'`

**WuxingAssessment.role 枚举**： `'yongshen' | 'jishen' | 'xianshen'`

**特殊格局**（化气/专旺/从格）：跳过平衡算法，直接按格局规则输出标签。

### preparePhase1Input 十神排序规则

三级排序（packages/core/src/bazi/preparePhase1Input.ts）：

1. 有节点且影响力 > 0 → 按影响力降序
2. 有节点但影响力 = 0（墓库锁闭）→ 排中间
3. 完全无节点（缺失）→ 排最后

## 大五人格算法（已锁定）

### 题库

- IPIP-NEO-120（Johnson 2014），120题，4轮×30题交叉排列
- 字典：`packages/core/src/psychology/bigfive/dictionary.ts`
- 已100%对照 `@alheimsins/b5-johnson-120-ipip-neo-pi-r` 官方包验证，零错误

### 计分

```
direction=1  → actualScore = answer.score
direction=-1 → actualScore = 6 - answer.score
按 domain/facet 分组累加 → BigFiveReport（5 domain，30 facet）

```

### 标准分

- T分 = 50 + 10×Z
- 常模来源：`bigfive_norms` 表（region/gender/age_group 15级级联匹配）
- 质性标签阈值：±1.5/±0.5 标准差

## 数据库（Supabase项目：wsbskrgrkajnzzgpcfws）

关键表：

- users（含vip_tier: free/lifetime/pro，dashboard_layout JSONB，language_preference）
- profiles（含birth_date/time/lat/lng/place_name/timezone/gender/is_self/**is_minute_unknown**）
- bazi_snapshots（八字盘计算结果，档案编辑时自动清空重算）
- bazi_readings（八字AI报告，永久保留，档案编辑不影响；见下方"报告闭环快照"）
- astrology_snapshots
- bigfive_assessments（domain_scores/facet_scores/region字段）
- bigfive_norms（region/gender/age_group常模）
- life_timeline（baseline_imbalance/baseline_energies/years JSONB）
- products / purchases

**外键关系（已用SQL核实，不是猜测）：**

```
public.users.id            → auth.users(id)         ON DELETE CASCADE   ← 本来就存在，删Auth用户会正确级联清空users及其下所有表
profiles.user_id           → users.id                ON DELETE CASCADE
bazi_readings.profile_id   → profiles.id             ON DELETE SET NULL  ← 这次改的，原来是CASCADE（同时profile_id列已改成允许NULL，原本是NOT NULL）
bazi_readings.purchase_id  → purchases.id            ON DELETE SET NULL
(其余 profile_id/user_id 外键均为 CASCADE，未改动)

```

**已知架构缺口（未修复，留作待办）**：`public.users` 表本身没有指向 `auth.users` 的外键（只是id恰好相同，数据库不知道这是同一个人）。这意味着：**通过 Authentication → Users 删除一个账户，能正确级联清空** `users`**及其下游所有表**（因为users.id有FK指向auth.users），但**反过来直接操作** `public.users` **单独一行（比如手动删测试数据）不会有任何反向保护**。以后重置测试账号必须从 Authentication → Users 删除，不要直接在数据表里删行——这条操作纪律比任何代码兜底都重要。

### `handle_new_user()` 触发器（auth schema，已用SQL核实）

```sql
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;

```

挂在 `auth.users` 的 `AFTER INSERT` 事件（触发器名`on_auth_user_created`，在auth schema，不在public schema，Database Triggers页面要切schema才能看到）。**只在真正发生一次INSERT时触发**——如果只删了`public.users`这一行、`auth.users`那个身份还在，这个账户会永久卡死（新登录不算INSERT，触发器不会再跑，`public.users`的行永远补不回来）。已在`callback/route.ts`和`confirm/route.ts`加了自愈逻辑防止这个问题导致后续写入静默失败。

**bazi_readings 表结构：**

```
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

```

**重要规则：**

- 档案编辑只清空 `bazi_snapshots`（八字盘重算），不碰 `bazi_readings`（报告永久保留）
- 报告渲染完全自包含：只读 `bazi_readings.calculation_result`，不依赖 `profiles`/`bazi_snapshots` 是否还存在
- "出生信息不符"提示：只在 `reading.profile_id` 非空（档案还存在）时才比对和显示；档案被删了就不提示，也不支持"重新生成"（这个功能天然需要一份活的档案）
- 资产管理显示所有 `bazi_readings` 记录，不过滤 status（支持中断恢复入口）
- 出生性别仅存数据库用于算法，绝对不在前端任何地方显示
- **报告生成语言未被记录**（已知缺口，用户决定暂不处理）：目前不管注册/生成报告那一刻界面是什么语言，Gemini prompt都是纯中文指令、固定中文键名输出，数据库里也没有任何字段记录"这份报告用什么语言生成"。以后要做"报告语言标注"这个UI功能，必须先补上这整套记录机制，不是简单显示一个已有字段。

## 五行颜色规范（单一真相）

```
Wood: #388E3C
Fire: #D32F2F
Earth: #F57F17
Metal: #757575
Water: #1976D2

```

## AI报告管道（八字解读）

### 数据流

```
用户触发 → /api/ai/reading (POST, 传snapshotId)
  → 读bazi_snapshots.calculation_result
  → 读profiles获取出生信息快照
  → 在bazi_readings创建新记录（状态：generating，同时把
    snapshot.calculation_result原样复制进calculation_result字段钉死）
  → preparePhase1Input(snapshot.calculation_result) 生成数据清单
  → 触发 generate-phase1（fire and forget，传snapshotId+readingId+dataSheet）
→ generate-phase1 → Gemini → 存bazi_readings.ai_reading_draft → 触发generate-theme1（传readingId）
→ generate-theme1 → 存bazi_readings.ai_reading_theme1 → 触发generate-theme2
→ generate-theme2 → 存bazi_readings.ai_reading_theme2 → 触发generate-theme3
→ generate-theme3 → 存bazi_readings.ai_reading_theme3 → 触发generate-theme4
→ generate-theme4 → 存bazi_readings.ai_reading_theme4，ai_reading_status="done"

```

"重新生成报告"走的是同一个入口，每次都会创建一条全新的`bazi_readings`记录（带自己的新`readingId`），所以"生成那一刻钉死快照"这个逻辑天然也覆盖了重新生成的情况，不需要额外处理。

### Edge Functions（Supabase，串行链式调用）

- generate-phase1：接收 `snapshotId`（读bazi_snapshots计算结果）+ `readingId`（写bazi_readings）+ `dataSheet`
- generate-theme1/2/3/4：只接收 `readingId`，全部读写 `bazi_readings`
- 五个函数全部不涉及`bazi_snapshots`或命盘图表，只管AI文字生成流水线——这次给报告加自留快照，只改了触发生成的`route.ts`一个文件，五个Edge Function都不用动
- 使用 `Deno.serve()` + `EdgeRuntime.waitUntil()` 绕过150秒超时
- temperature: 1.0，无 responseMimeType，防弹JSON解析装甲
- 模型：gemini-2.5-pro-preview（注意：代码里写的是gemini-3.1-pro-preview，实际以Supabase控制台为准）

### assessments/status API

- 同时返回 `snapshotId`（bazi_snapshots.id）和 `readingId`（bazi_readings最新记录id）
- `BaziReadingCard` 用 `readingId` 跳转报告页，用 `snapshotId` 触发新报告生成

### 报告页架构

路由：`/{locale}/dashboard/assessments/bazi/reading?readingId=...`（物理位置不在`(os)`路由组下，见"路由结构"一节）

- `page.tsx`（Server Component）→ 读bazi_readings（含calculation_result），若profile_id存在才读profiles对比出生信息+读bazi_snapshots取最新snapshotId（供重新生成用），传birthMismatch给客户端
- `BaziReadingView.tsx`（Client Component）→ 长页滚动，Supabase Realtime订阅bazi_readings实时更新，birthMismatch触发弹窗；顶栏返回按钮=纯图标ChevronLeft+router.back()（不写死目标地址，因为报告可能从八字主页或资产管理进入）
- `BaziReadingChart.tsx` → 三种SVG命盘模式，全部读props传入的calculationResult，不关心数据来源

### 报告页布局规则

- 大标题（人格核心/心理机制/现实反应/调优建议）：fontSize 28px，大标题之间留白 mb-16
- 次级标题（十神名/场景名等）：fontSize 18px
- 正文：text-sm（14px）
- 十神之间、场景之间、建议之间：短横线（w-8 border-t）
- 机制交互与十神之间、自洽建议与针对性优化之间：长横线（border-t）
- 顶部固定导航栏：左侧纯图标返回按钮（ChevronLeft，router.back()），右侧ThemeToggle
- 界面右上角固定分享按钮（top-16 right-6），点击展开菜单含PDF下载

### BaziReadingChart 三种模式

1. **BaziOverviewChart**（主题一）：完整命盘，日干有颜色，其余全部淡化（含日支）。尺寸280×140px，viewBox 500×250
2. **BaziShishenChart**（主题二十神）：节点图，280×210px，viewBox 500×375
3. **BaziInteractionChart**（机制交互）：节点图，280×210px，viewBox 500×375

### 节点图渲染规则（BaziShishenChart）

- 天干行/地支行/藏干行各占125pt高度，共3行
- **天干**：阴阳五行完全一致→颜色+方框；五行同阴阳不同→颜色无方框；其他→淡化
- **地支**：全部淡化，连线穿过但不显示颜色（不参与关系展示）
- **藏干**：参与关系的才显示（其余完全不渲染）；完全一致→颜色+方框；五行同阴阳不同→颜色无方框；墓库锁闭→虚线方框
- 每个地支最多一个藏干参与关系（八字原理）
- 藏干查找：按五行匹配（wuxing === shishenWuxing），不固定本气
- 方框判断：阴阳五行完全匹配（wuxing + yinyang 都一致）
- **连线路径**（直角折线）：
  - 通根：天干底部→自坐地支中心→横向→目标地支中心→藏干顶部
  - 透出：藏干顶部→所在地支中心→横向→目标地支中心→天干底部
- 连线颜色：该十神的五行颜色

### 机制交互图渲染规则（BaziInteractionChart）

- 参与关系的节点（天干或地支）→ 颜色+方框（各自五行色）
- 不参与的节点 → 淡化
- 连线颜色：黑色/白色（hsl(var(--foreground))，随深浅模式变化）
- 仅显示天干行+地支行，无藏干行

### PDF导出

- 库：`@react-pdf/renderer` + `html2canvas`
- 字体：本地TTF文件，`apps/web/public/fonts/`——**已从 NotoSansSC/TC/JP/KR + NotoSans 换成 Source 家族**（Source Sans 3 直接从 Adobe 下载 TTF；Source Han Sans CN/TW/JP/KR 由 OTF 转 TTF），换血时做过实际生成 PDF + 文本回读的验证（五种文字脚本回读结果一致），原 NotoSans 系列文件已删除。此次换血同时覆盖了片语模块的网页端字体（见 `Mindo-片语.md` 第十九节），两处保持同一血统
- 字体格式必须用 `.ttf`（.otf支持不稳定）
- 按locale按需加载字体，用 `window.location.origin` 拼完整URL
- 字体注册加时间戳（`fontFamily = fontConfig.name + '-' + Date.now()`）防止缓存
- **中文换行关键**：必须用以下 hyphenationCallback，把每个字符变成独立换行单位： 
  ```typescript
  Font.registerHyphenationCallback((word) => {  if (word.length === 1) return [word]  return Array.from(word).flatMap((char) => [char, ''])})

  ```
- 命盘图表用 `html2canvas` 截图（hidden容器，`position:fixed, opacity:0, zIndex:-1`）
- 文字宽度限制：每个 `Text` 组件用 `width: 483`（A4 595pt - padding 56×2）
- 四页结构：人格核心/心理机制/现实反应/调优建议各一页
- `next.config.ts` 需要：`transpilePackages: ['@react-pdf/renderer']`
- Hook路径：`apps/web/src/hooks/usePdfExport.tsx`（不用useCallback，避免缓存问题）

## 认证与Onboarding

### 登录方式

- Google OAuth：`queryParams: { prompt: 'select_account' }`强制每次弹账号选择框，不静默复用浏览器已有登录状态
- Facebook OAuth：onboarding内嵌登录表单和独立`/auth/login`页面都要有，两处UI是分开维护的，容易漏同步
- 邮箱验证链接：`/api/auth/confirm`

### 语言优先级（OAuth回调 `/api/auth/callback/route.ts`）

```
登录那一刻界面正在用的语言（通过redirectTo的locale参数传递）
→ 浏览器 Accept-Language
→ 数据库 users.language_preference（历史遗留，几乎不会命中）
→ 英文兜底

```

解析出的语言会顺手写回 `users.language_preference`（如果原本是空的）。触发OAuth的按钮（`handleGoogleLogin`/`handleFacebookLogin`）必须在`redirectTo`里带上`&locale=${locale}`，不然这个优先级链条的第一环就拿不到值。

### 自愈机制（callback/route.ts + confirm/route.ts）

- 查`public.users`用`maybeSingle()`不用`single()`——`single()`查不到行时会把error静默丢在解构里不处理，等同于把"这行不存在"这件事吞掉
- 如果查不到，用admin客户端补一份最小版本（`{id, email}`，跟`handle_new_user()`触发器一致），防止后续写`profiles`时因为外键约束失败
- `confirm/route.ts`（邮箱登录）也补上了handle自动生成逻辑，之前只有`callback/route.ts`（Google登录）有这段，邮箱注册用户一直没有handle

### Onboarding "先体验后注册"流程的认证保护逻辑

- 正常流程：填生日→时间地点→性别（全程匿名，不需要登录）→ teaser预览 → 登录 → 提交
- Google/Facebook登录是**整页跳转**（离开网站去对方平台，再跳回来），这会让onboarding页面组件被销毁重建，之前"监听登录成功就自动提交"的机制会跟着页面一起消失，永远不会被触发
- **修复方案**：页面挂载时检测`sessionStorage`（`SESSION_KEY`，tab-scoped）里有没有已填写的表单数据
  - 有数据+已登录 → 判定为"OAuth跳转返回，同一个标签页"，直接用恢复出来的数据自动完成提交
  - 无数据+已登录 → 判定为"共用设备场景，不同的人碰到了残留登录状态"（sessionStorage不跨标签页共享，能利用这一点区分），主动登出，保证不会有人在不知情的情况下把资料填进别人账号
  - 这个判断逻辑取代了之前一版"只要挂载时发现已登录就无条件登出"的方案——那版会误伤"刚合法OAuth跳转回来"的正常情况，已废弃，不要恢复
- 检测逻辑用`useLayoutEffect`（不是`useEffect`），避免"先渲染错误的中间态、再切换"这种闪烁

### 已讨论但明确否决/搁置的方案（不要重新实现）

- **"退出到首页"按钮**：曾经加过又主动撤掉了——onboarding里放退出入口被认为是负面体验，不需要
- **pagehide/beforeunload清登录状态**：讨论过用页面卸载事件清本地凭证，实现复杂（至少要排除"OAuth跳转中""提交成功跳转中"两类误伤场景），用户评估后放弃这个方向，选择接受现有的sessionStorage方案
- **邮箱注册handle自动生成的命名统一**（`hourPlaceholder` vs `unknownMinute`两个键命名风格不一致）：用户决定不改

### 账户注销（/api/account/delete/route.ts）

- 必须调用`adminClient.auth.admin.deleteUser(user.id)`真正删除Auth身份，只调`supabase.auth.signOut()`只是清本地会话，不会删除`auth.users`记录——这是这次修复前的实际bug，导致"注销"后账号还留在Authentication列表里
- 删除顺序：先清各业务表（RLS保证只能删自己的）→ 再删Auth身份（写在最后，即便这步失败，业务数据至少已经清空，不会出现"身份没了、数据却还残留"的反向不一致）

## 报告页架构补充：`(os)`路由组的正确用法

`(os)`文件夹是给"需要Dock+TopBar导航框架的页面"分组用的路由组，本身不出现在网址里。任何独立于导航框架之外的页面（比如报告长页），应该放在`(os)`外面，会自动跳过这层布局、直接继承根布局（`[locale]/layout.tsx`，含ThemeProvider/next-intl等全局能力，不受影响）。之前项目里长期只有`(os)`一个路由组、没有配对的"非(os)"页面，导致这个机制的用途一直没有被真正用到——报告页搬家是第一次真正利用这个设计。

## 人生运势图（LifeKlineCard）

- 暂时隐藏（注释在bazi/page.tsx），待算法完善后恢复
- 算法问题：三会触发改写藏干baseScore导致能量异常放大，待解决

## 工作方式

- 架构讨论/产品决策：在此Project对话进行
- 代码施工：开新Claude Code会话，读CLAUDE.md后执行，完成后更新CLAUDE.md
- 每次施工后必须更新CLAUDE.md并推送到GitHub
- git commit必须用heiyi98账号（否则Vercel部署被blocked）
- 启动开发：cd E:\destinos\apps\web && pnpm dev
- 含中文的文件禁止用PowerShell直接修改，必须发给Claude输出后替换
- **架构级改名/重构收尾必须做全局搜索**，不要只改"报错提示的那一个文件"就收工

## 关键教训

- PowerShell -replace命令会损坏UTF-8中文字符，含中文的文件必须发给Claude修改后输出
- Turbo远程缓存会掩盖TypeScript错误，新建Vercel项目时会暴露历史积累的错误
- Noto_Sans_SC/TC 不接受 subsets 参数，直接省略即可
- vercel.json的cron表达式Hobby账号只支持每天一次（`0 0 * * *`）
- Vercel webhook偶发失效时，删除重建项目是最彻底的解法
- @react-pdf/renderer中文换行：必须用hyphenationCallback把每个字符拆开，不能用useCallback（缓存问题），字体必须用.ttf格式，路径必须用window.location.origin拼完整URL
- **engine → baziEngine 重命名（已完成）**：`packages/core/src/bazi/engine.ts` 导出的对象从 `engine` 改名为 `baziEngine`。**禁止在任何新代码里 import** `engine` **from** `@mindo/core`**，正确名字是** `baziEngine`
- **baziEngine.calculate API签名变更**：不再接受 `{ dateStr, lat, lng, timeUnknown }`，必须先调 `calculateUniversalTime(input)` 得到 `timeResult`，再调 `baziEngine.calculate(timeResult)`（参见 dashboard/route.ts 的 computeAndSave 函数）。参数类型现在直接引用`UniversalTimeResult`，两边不会再因为手写重复类型而不同步
- **divination → assessments 全局改名**：路由、文件夹、Dock导航、报告卡片跳转、报告页返回/重生成跳转、资产页跳转全部涉及。这类改名极易漏改分散在各处的硬编码路径字符串，这次至少独立发现过4次遗漏，改名后必须做一次全局搜索旧名字确认零残留
- **CSS自定义属性在calc()里必须带单位**：`--ext-len`这类自定义属性如果设成纯数字（无px），`calc(-1 * var(--ext-len))`算出来的是无量纲数值，某些浏览器场景下会被判定为非法声明整条丢弃，回退到属性初始值——不是"能不能用变量"的问题，是"变量值要不要带单位"的问题
- **useEffect vs useLayoutEffect**：凡是"设置好某个值/状态之后，希望第一帧绘制就已经是正确结果，不能有一帧是错的"的场景，必须用useLayoutEffect（浏览器画面之前同步执行），用useEffect会导致肉眼可见的一帧闪烁或错误初始状态
- `.single()` **vs** `.maybeSingle()`：Supabase查询如果预期"可能查不到行"，必须用`maybeSingle()`，`single()`在查不到时会把error静默丢在解构结果里不处理，容易把"这一行压根不存在"这件事误判成"查到了、只是字段是null"
- **sessionStorage不跨标签页共享，localStorage跨标签页共享**：这个区别可以用来分辨"同一次操作的延续"和"完全不同的人/时机"，onboarding的认证保护逻辑用的就是这个原理
- **手动删测试数据必须走Authentication→Users删除，不要直接删数据表里的行**：`public.users`没有自己的外键指向`auth.users`，直接删数据表的行不会被任何机制自动修复，会导致账号永久卡死（触发器只在真正的INSERT事件时触发一次）
- `writing-mode: vertical-rl` **会改变** `text-align` **的语义**：横排时 `text-align` 控制左右，切到竖排后实际控制的是另一个轴（近似"上下"），不再代表左右——想让竖排文字块整体贴左/居中/贴右，必须交给外层容器的 flex `justifyContent`，同时竖排的文字节点不能设 `width: 100%`（会让文字块永远撑满、废掉外层 justifyContent 的腾挪空间）。这是CSS本身的行为，不是bug，已查证日文竖排排版社区的标准做法一致
- **lucide 图标命名里 "xxxVertical" 和 "xxxHorizontal" 的语义**：`AlignStartVertical`/`AlignCenterVertical`/`AlignEndVertical` 表示"对齐一条竖线基准"（实际控制左右位置）；`AlignStartHorizontal`/`AlignCenterHorizontal`/`AlignEndHorizontal` 表示"对齐一条横线基准"（实际控制上下位置）——命名直觉容易理解反，用之前需确认清楚
- **CSS Grid** `repeat(n, 1fr)` **比 flex+justify-content/justify-between 更适合做"n个元素严格等宽分布"**：flex 分组+两端对齐容易导致组间距和组内距不一致；多行需要互相对齐（比如某一行的某个元素要精确对齐上一行第某列）时，让所有行共用同一套显式的 grid 列定义，比逐行手工核对像素可靠得多
- **奇数/偶数等分点不能想当然嵌套**：把一段范围先按 A 份切、再往其中一份内部按 B 份切，不代表内部切出来的分割点会和外部按 A 份切的分割点在数学上重合（比如"5等分"套进"3等分"里的其中3份宽度，两者的分割点大多数对不上，除非显式计算好每个点该在整体的第几分之几，用绝对定位摆到算好的精确百分比位置）
- **Fontsource 包 = Google Fonts 官方目录的打包镜像，技术名不代表设计血统**：`@fontsource/noto-sans-sc/tc/jp/kr` 等包名叫"Noto"，但字节内容跟 Adobe 发布的"Source Han Sans/Serif"完全一致，因为 Google 当年把同一份东西重新挂了自己的品牌对外发布——引入这类包时，界面上呈现给用户的名字要走独立的"技术名→显示名"映射表，不能让技术名直接暴露给用户
- **对可能残缺的对象做兜底，要按字段各自兜底，不能只判断整个对象是否为 null/undefined**：`MindCardBody` 原来写的是 `style ?? DEFAULT_MIND_CARD_STYLE` 再解构出 `card`/`runs`——如果 `style` 列在数据库里非 NULL、但内容是残缺对象（比如 `{}`，只缺 `card`/`runs` 字段），这种值是 truthy，会跳过 `??` 的兜底，解构出来的字段仍是 `undefined`，照样崩溃。片语模块"我的卡片"个人页上线时，第一次渲染到用户自己发布的历史卡片（关注/推荐两个tab天然不会把你自己的卡片展示给你自己看，之前这些行从未被任何界面渲染过）就踩中了这类残缺行。正确写法是逐字段兜底：`style?.card ?? DEFAULT_CARD`、`style?.runs ?? []`。**这次踩坑的教训**：`MindCardBody` 修过之后，`MindCardDetailModal.tsx` 里独立写的 `card.style?.card.vertical`（只在第一层加了 `?.`，第二层 `.card.vertical` 忘了继续链下去）又崩了一次——同一个字段的兜底逻辑如果在多个文件里各自重复实现，必须每一处都检查到位，不能默认"共享组件已经修过就全局安全了"

## 已完成模块

- [x] 全部基础架构（Monorepo/路由/多语言/设计系统/导航框架）
- [x] Supabase Auth（Magic Link + Google/Facebook OAuth + 密码登录，含账号选择器强制弹出、语言优先级传递、自愈补丁）
- [x] Onboarding流程（含认证保护逻辑：区分OAuth跳转返回 vs 共用设备残留登录）
- [x] 八字引擎（七步分析/格局判定/五行评估/AI数据准备）
- [x] 时间引擎独立模块（packages/core/src/time/，真太阳时/行政时区双模式，紫微星盘等未来模块可复用）
- [x] 大五人格（120题/引擎/雷达图翻转玫瑰图/常模匹配/T分）
- [x] 西洋星盘（SVG星盘图）
- [x] 付费系统（Lemon Squeezy）
- [x] AI解读API（Gemini，五个Edge Functions串行链式）
- [x] 仪表盘6列网格（自定义拖拽/碰撞解决/布局持久化）
- [x] 卡片架构重构（modules/目录，卡片自治，profileId唯一prop）
- [x] ProfileCard SVG化（文字等比缩放，真太阳时统一显示不再区分精度）
- [x] 测算中心页面改名divination→assessments（含独立词典文件）
- [x] 用神算法重构（链式反应系数/闲神分类/强弱阈值）
- [x] AI报告页（长页滚动，四主题，命盘节点图，深浅模式切换，PDF导出）
- [x] preparePhase1Input 十神排序修复（墓库锁闭排在缺失十神前面）
- [x] 命盘卡片完整重构（表格样式/展开藏干/十神切换/GridContext/中文词典映射）
- [x] Dock导航栏改造（图标改User，悬停显示模块名，路径同步assessments改名）
- [x] 档案管理拖拽排序（本人档案锁顶，其余静默保存排序）
- [x] 报告闭环快照（bazi_readings自留calculation_result，profile_id外键改SET NULL，报告不再依赖档案/快照是否存在）
- [x] 报告页搬出(os)路由组（消灭报告页多余的Dock导航栏，返回按钮改用router.back()）
- [x] 资产管理页面完善（出生地完整显示不截断，新增真太阳时展示，服务端解析不传整份大JSON）
- [x] 账户注销真删除（补上adminClient.auth.admin.deleteUser调用）
- [x] 片语模块（原思绪卡片）：后端全套（隐私分级/五行+大五相似度算法/排序公式/召回机制/已读清理定时任务）+ 前端（横向轮播浏览页/圆弧菜单栏/独立编辑页/Tiptap富文本编辑器/九宫格工具栏/自托管Source字体系统含Fontsource包+PDF字体换血）+ 卡片集功能第一轮（收藏夹/自建卡片夹/订阅/个人页三栏，新增`mind_card_folders`/`mind_card_folder_items`/`mind_card_folder_subscriptions`/`mind_card_favorite_notifications`四张表，MVP阶段的`mind_card_favorites`因从未有真实数据已直接退役）+ 卡片集第二轮细化（图标/术语改名"卡片夹→卡片集"、点赞功能`mind_card_likes`整体退场、"我的卡片"新增删除+改可见度操作、卡片集列表重构为3:4展示框网格+封面取夹内最新卡片+新建入口、卡片集拖拽排序含默认收藏夹、默认收藏夹改名/改介绍在接口层拒绝、个人页搬出`(os)`路由组改用返回按钮）。详见 `Mindo-片语.md`，未闭环事项见该文档第二十四节，卡片集详情见第二十八节

## 待完成

- [ ] 全项目搜索确认没有遗漏的divination路径残留（已知修复：Dock/BaziReadingCard/BaziReadingView/报告page.tsx/资产page.tsx；不确定是否还有翻译文件里的链接文案或别的硬编码）
- [ ] `public.users`补一个指向`auth.users(id)`的外键（ON DELETE CASCADE），或者写一个对称的`handle_deleted_user`触发器——目前删Auth用户不会自动清空public.users这一层（虽然users.id本身有CASCADE，但那是users→auth单向的，不是auth→users）
- [ ] 老的bazi_readings记录没有calculation_result快照，图表会缺失（用户决定不迁移，账号回头整体注销重来）
- [ ] 报告生成语言记录机制（目前完全没有，Gemini prompt固定中文，用户决定暂缓）
- [ ] 左/上导航栏层级规则（"左永远高于上"）：报告页搬家后原本的重叠案例已自动解决，但还没有确立成通用规则，TopBar.tsx现状未审查
- [ ] ui.json里`onboarding.timePicker.unknownMinute`需要正式填入翻译内容（目前靠defaultMessage兜底）
- [ ] payment翻译命名空间需要从ui.json搬到bazi模块自己的词典文件（用户已决定但还没执行）
- [ ] Supabase OAuth回调URL更新（新Vercel域名）
- [ ] 其他卡片切换档案清空state（WuxingRadarCard/DayMasterCard/BaziReadingCard/StarChartWheel/ProfileCard）
- [ ] 报告生成中断恢复（资产管理/报告卡片入口，从断点继续生成）
- [ ] ai_reading_translated字段（多语言翻译缓存）
- [ ] 人生运势图算法修复（三会改写藏干问题）
- [ ] 日主小人PNG图片（/public/images/daymasters/{pinyin}.png）
- [ ] 大五人格结果解读文字
- [ ] 十天干人格档案文字
- [ ] 紫微斗数模块
- [ ] MBTI模块
- [ ] 论坛、商城、私信模块
- [ ] 中国版部署（阿里云）
- [ ] 时间选择"只填小时不填分钟导致小时也丢失"的bug——用户提到过但会话中没有实际排查修复
- [ ] 片语：`MindCardBackgroundColor` 类型定义（`style.ts`）与选择器组件的可选项是否已同步收紧（选择器已去掉"默认跟随主题"选项，只留黑白，但类型层面可能仍保留空字符串这个值）
- [ ] 片语：桌面端编辑卡片的 `maxWidth: 400px` 是估算值，需要真机/浏览器实测确认是否合适
- [ ] 片语：留言（评论）、通知系统、草稿箱——均仍是规划阶段，未开工。收藏夹分组管理已完成（卡片集功能）。通知系统仍依赖留言等具体事件先存在（收藏产生的通知除外，已最小化实现，只写入`mind_card_favorite_notifications`表，无通知中心UI）
- [ ] 片语：候选语言（越南语/马来语/印尼语/泰语）暂不安装，手写体字体候选暂缓，均待用户后续决定
- [ ] 片语·卡片集：订阅/取消订阅功能本轮冒烟测试未覆盖，需要后续单独验证
- [ ] 片语·卡片集：`folder_kind='journal'`（记录型）完全未实现，仅数据库字段值预留
- [ ] 片语·卡片集：目前没有任何"查看他人卡片集/订阅入口"的界面（个人页范围定为仅查看自己），`subscription.subscribeButton`翻译键已备好但无处调用；`GET /api/mind-cards/profile/*`系列接口已支持`?userId=`参数，未来做他人主页时无需改接口
- [ ] 片语·卡片集：`mindcards.folderActions.edit`/`deleteDefaultBlocked`/`myCards.changeVisibility`几个翻译键已按需求文档要求建好，但本轮UI未实际用到文字（图标即符号，不加tooltip；默认夹的删除按钮直接不渲染而不是禁用态提示），属于预留字符串