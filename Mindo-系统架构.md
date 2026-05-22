# Mindo 系统架构文档

## 整体架构
```
用户浏览器
  ↓
Vercel（Next.js App Router）
  ├── 前端页面（/{locale}/...）
  └── API Routes（/api/...）
        ├── Supabase（数据读写）
        ├── Gemini（AI解读）
        ├── Lemon Squeezy（支付）
        └── Nominatim（城市搜索）
```

## Monorepo结构
```
E:\destinos/
├── apps/
│   └── web/                        ← Next.js 16主应用
├── packages/
│   ├── core/                       ← 计算引擎（纯逻辑，无UI依赖）
│   ├── db/                         ← 数据库schema和客户端
│   ├── ui/                         ← 共享UI组件库
│   └── config/                     ← 共享TypeScript/ESLint配置
├── CLAUDE.md                       ← 项目记忆
└── pnpm-workspace.yaml
```

## apps/web 目录结构
```
apps/web/
├── src/
│   ├── app/
│   │   ├── [locale]/               ← 多语言页面
│   │   │   ├── page.tsx            ← 落地页
│   │   │   ├── onboarding/         ← 引导流程
│   │   │   ├── auth/               ← 登录/错误页
│   │   │   └── dashboard/
│   │   │       ├── (os)/           ← 路由组（共享导航框架）
│   │   │       │   ├── page.tsx    ← 仪表盘主页
│   │   │       │   ├── divination/ ← 测算中心
│   │   │       │   │   ├── page.tsx
│   │   │       │   │   ├── bigfive/
│   │   │       │   │   └── western/
│   │   │       │   ├── profile/    ← 账户/档案/资产
│   │   │       │   ├── forum/      ← 论坛（占位）
│   │   │       │   ├── shop/       ← 商城（占位）
│   │   │       │   └── messages/   ← 私信（占位）
│   │   │       └── layout.tsx      ← OS框架（Dock+状态栏）
│   │   └── api/
│   │       ├── auth/               ← 认证回调
│   │       ├── dashboard/          ← 仪表盘数据+八字快照
│   │       ├── profiles/           ← 档案CRUD
│   │       ├── assessments/        ← 测算状态查询
│   │       ├── psychology/
│   │       │   └── bigfive/        ← 大五计算+结果
│   │       ├── astrology/
│   │       │   └── western/        ← 西洋星盘
│   │       ├── ai/
│   │       │   └── reading/        ← Gemini解读生成
│   │       ├── payments/           ← Lemon Squeezy
│   │       ├── city-search/        ← Nominatim城市搜索
│   │       └── onboarding/         ← 引导完成写入
│   ├── components/
│   │   ├── os/                     ← 全局框架组件
│   │   │   ├── CurrentProfileContext.tsx
│   │   │   ├── TopBarContext.tsx
│   │   │   └── ...
│   │   ├── dashboard/              ← 仪表盘组件
│   │   ├── divination/             ← 测算组件
│   │   │   ├── bigfive/
│   │   │   └── western/
│   │   └── onboarding/             ← 引导流程组件
│   │       └── steps/              ← DatePicker/TimePicker/CityPicker等
│   ├── hooks/                      ← 自定义Hooks
│   │   └── useBigFiveQuiz.ts
│   ├── lib/
│   │   ├── supabase/               ← Supabase客户端（server/client）
│   │   ├── timezones.ts            ← 时区选择器数据（TIMEZONE_OPTIONS）
│   │   └── administrative-timezones.ts ← 全球行政时区映射表
│   ├── i18n/
│   │   ├── request.ts              ← next-intl配置（多文件合并）
│   │   └── routing.ts              ← 语言路由配置
│   └── config/
│       └── assessments.ts          ← 测算模块注册表（单一数据源）
└── messages/
    ├── en/
    │   ├── ui.json                 ← 全局UI文本
    │   ├── assessments/index.json
    │   ├── bigfive/
    │   │   ├── index.json          ← 维度/子维度/控件
    │   │   └── questions.json      ← 120道题（q001-q120）
    │   └── western/index.json
    └── zh/fr/de/es/ja/ko/it/      ← 同结构
```

## packages/core 结构
```
packages/core/src/
├── bazi/
│   ├── engine.ts      ← 四柱排盘 + 真太阳时计算
│   ├── analysis.ts    ← analyzeBazi（七步）+ toBaziSnapshot
│   ├── timeline.ts    ← 大运流年时间轴
│   ├── pro.ts         ← 专业模式入口
│   └── types.ts       ← 全部类型（TianGan/DiZhi/BaziAnalysis等）
├── psychology/
│   └── bigfive/
│       ├── engine.ts      ← calculateBigFive
│       ├── dictionary.ts  ← ipipNeo120Dictionary（逻辑结构）
│       ├── alheimsins.ts  ← buildQuestions（题目构建）
│       ├── schema.ts      ← Zod验证
│       ├── types.ts
│       └── index.ts
└── astrology/
    └── western/
        ├── AstroMath.ts
        ├── PlanetEngine.ts
        ├── StarChartService.ts
        ├── types.ts
        └── index.ts
```

## 数据库表结构
```
users
  id, email, vip_tier(free/lifetime/pro), language_preference

profiles
  id, user_id, display_name
  birth_date, birth_time, birth_lat, birth_lng
  birth_place_name, birth_timezone(IANA名称), gender(M/F)
  is_self

snapshots
  id, profile_id, user_id
  snapshot_type(文本，不枚举：bazi/bigfive/western等)
  calculation_result(JSONB，七段式存储)
  ai_reading(text)
  ai_reading_translated(JSONB，{en:..., fr:...}多语言缓存)

products
  id, name, provider, variant_id, price, assessment_type

purchases
  id, user_id, provider, status, snapshot_id, purchased_at
```

## 关键设计决策

### 快照机制
- 计算结果存为快照（snapshots表），不重复计算
- 旧格式检测：pillars.yuelingWuxing是否存在
- 新格式（七段式）：meta/pillars/relations/tougen/energy/shishen/influence

### 多语言架构
- next-intl，运行时动态合并多个JSON文件
- request.ts里的loadMessages()递归合并模块文件
- 翻译键路径：useTranslations('bigfive.questions')→读bigfive/questions.json

### 测算模块注册
- 单一数据源：src/config/assessments.ts
- 所有测算模块的元信息（名称/描述/状态/路由）在这里维护
- /api/assessments/status根据此配置查询各模块完成状态

### AI解读流程
```
付款成功（Lemon Squeezy webhook）
→ /api/ai/reading
→ 读snapshots.calculation_result
→ formatBaziDataSheet()生成中文数据清单
→ 中文Prompt + 数据清单 → Gemini
→ 中文解读存入snapshots.ai_reading
→ 其他语言用户：调用Gemini翻译
→ 翻译结果缓存到snapshots.ai_reading_translated
```

### 导航框架
- OS层：双轴导航（左侧48px Dock + 顶部48px状态栏）
- 用React Context实现，不用Parallel Routes
- TopBarContext：各页面可独立注入顶部内容
- CurrentProfileContext：全局共享当前档案状态