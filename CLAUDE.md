\# Mindo — 项目记忆文件



\## 项目简介

全球化赛博玄学Web App，集命理测算、心理测量、社区论坛、社交匹配、周边商城于一体。



\- 生产环境URL：https://mindo-web.vercel.app

\- GitHub仓库：https://github.com/heiyi98/Mindo

\- 本地路径：E:\\destinos



\## 当前技术栈

\- Monorepo工具：pnpm workspace + Turborepo

\- 前端：Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion

\- 国际化：next-intl 4.x

\- 数据库：Supabase（PostgreSQL + RLS）

\- 图标：lucide-react

\- 部署：Vercel（国际版）/ 阿里云（中国版，待定）

\- 开发环境：Windows PowerShell 5.x，Claude Code



\## Monorepo结构

```

apps/web/          ← Next.js前端主应用

packages/core/     ← 命理+心理计算引擎（纯逻辑，无UI依赖）

packages/db/       ← 数据库schema和Supabase客户端

packages/ui/       ← 共享UI组件库

packages/config/   ← 共享TypeScript/ESLint配置

```



\## 多语言规则（铁律，不得违反）

1\. 任何组件里禁止出现硬编码的中文或英文用户可见字符串

2\. 所有文字必须通过 useTranslations() 或 getTranslations() 读取

3\. 翻译文件结构：apps/web/messages/{locale}/ui.json（基础UI）+ 模块子目录

&#x20;  - messages/{locale}/bigfive/index.json（大五主体）

&#x20;  - messages/{locale}/bigfive/questions.json（120道题目）

&#x20;  - messages/{locale}/western/index.json（西洋星盘）

&#x20;  - messages/{locale}/assessments/index.json（测算注册表）

4\. 当前支持语言：en（默认）、zh、fr、es、ja、ko、it、de

5\. 新增功能时必须同步更新所有语言文件，至少en和zh必须完整



\## 路由结构

```

/{locale}/                              → 落地页

/{locale}/dashboard/                    → 仪表盘主页

/{locale}/dashboard/divination/         → 测算中心

/{locale}/dashboard/divination/bigfive/ → 大五人格

/{locale}/dashboard/divination/western/ → 西洋星盘

/{locale}/dashboard/profile/            → 账户管理

/{locale}/dashboard/profile/profiles/  → 档案管理

/{locale}/dashboard/profile/assets/    → 资产管理

/{locale}/dashboard/forum/             → 论坛（待开发）

/{locale}/dashboard/shop/              → 商城（待开发）

/{locale}/dashboard/messages/          → 私信（待开发）

/{locale}/onboarding/                  → 引导流程

/{locale}/auth/login/                  → 登录页

```



\## 架构铁律

1\. 模块完全解耦：任何单一模块的修改不得影响其他模块

2\. AI调用必须走后端API路由，禁止在前端暴露任何Prompt

3\. 所有颜色和间距必须引用设计系统变量，禁止硬编码

4\. 计算结果必须存为快照，禁止重复触发计算

5\. packages/core 禁止引入任何前端框架依赖

6\. 新增数据库字段必须先执行SQL再写代码



\## packages/core 目录结构（已锁定）

```

packages/core/src/bazi/

├── constants.ts   ← 所有静态数据表

├── utils.ts       ← calcShiShen / isAdjacent 等共享工具

├── engine.ts      ← 排盘 + 真太阳时

├── analysis.ts    ← 七步分析引擎

├── pattern.ts     ← 格局判定

├── yongshen.ts           ← 五行全局评估（computeWuxingAssessment）

├── preparePhase1Input.ts ← AI解读第一阶段输入准备

├── timeline.ts    ← 大运流年

└── types.ts       ← 全部类型定义

```



\## 数据库（Supabase项目：wsbskrgrkajnzzgpcfws）

关键表：

\- users（含vip\_tier: free/lifetime/pro）

\- profiles（含birth\_date/time/lat/lng/place\_name/timezone/gender/is\_self）

\- snapshots（snapshot\_type文本类型，calculation\_result为JSONB）

\- products（测算产品注册）

\- purchases（含status/snapshot\_id/provider）



\## BaziSnapshot七段式存储结构

```

calculation\_result: {

&#x20; meta:     { solarTime, lunarTime, jieQi }

&#x20; pillars:  { year/month/day/hour, yuelingWuxing, tianGanNodes, cangGanNodes }

&#x20; relations:{ tianGanHe, tianGanChong, diZhiRelations }

&#x20; tougen:   { touGenResults, cangGanVisibility }

&#x20; energy:   { energyNodes }

&#x20; shishen:  { shishenMap }

&#x20; influence:{ shishenInfluence, dayMasterEnergy }

&#x20; dayStem, energyScores  ← 前端展示用

&#x20; pattern:  { category, name }         ← 格局判定结果

&#x20; wuxingAssessment: WuxingAssessment[] ← 五行全局评估（用神/忌神/强度/十神影响）

}

```



\## 真太阳时算法

```

1\. 用城市经纬度查 administrative-timezones.ts 映射表 → 行政时区

2\. 用户输入时间（行政时间）转UTC：localTime - utcOffset

3\. 均时差（Spencer公式，根据出生日期计算）

4\. 经度修正：(lng - utcOffset×15) × 4分钟

5\. 真太阳时 = UTC + 经度修正 + 均时差

注意：用户输入的永远是出生地行政时区时间

```



\## 八字能量算法（七步执行顺序）

```

步骤0：天干五合判定（真化/合绊/争合/妒合）→ 真化改写五行

步骤1：透根判定（化神后扫描）

步骤1.5：十神挂载

步骤2：地支关系标注（三会/三合/半合/拱合/六合/六冲/刑/害/破，只标注）

步骤3：月令系数（得令×2.0，近旺×1.33，泄气×0.83，受制×0.67，失令×0.33）

步骤4：独立能量计算（透根系数已废弃，改为二元规则）

&#x20; 天干有根 → 30 × 月令系数 × 3

&#x20; 天干无根 → 30 × 月令系数 × 1

&#x20; 藏干透出 → 基础分 × 月令系数 × 3

&#x20; 藏干不透 → 基础分 × 月令系数 × 1

步骤5：合绊/墓库标记（保留能量，对外输出=0，日干例外）

步骤6：宫位距离权重（勾股定理，日干为原点）

&#x20; 年干0.50 | 年支0.45 | 月干1.00 | 月支0.71

&#x20; 日支1.00 | 时干1.00 | 时支0.71

步骤7：十神影响力总值 = Σ(节点能量 × 宫位权重)

```



\## 格局判定优先级

```

优先级顺序（高→低，首个命中即返回）：

化气格：天干五合出现 ZhenHua 且日主参与

专旺格（五格）：曲直/炎上/稼穑/从革/润下

&#x20; 非土：地支三会/三合 = 日主五行 且无官杀

&#x20; 土（稼穑格）：四柱地支全在辰戌丑未 且无木

从格（四子类）：

&#x20; 从儿格：无印比 且三会/三合→食伤

&#x20; 从财格：无印比 且三会/三合→财

&#x20; 从杀格：无印比 且三会/三合→官杀

&#x20; 从强格：月令主气为印 且三会/三合该五行 且无财

正格（十种）：扫描月支藏干透干者（本气→中气→余气），无透兜底本气

&#x20; 正官/七杀/正印/偏印/正财/偏财/食神/伤官/比肩/劫财

PatternResult: { category: 'huaqi'|'zhuanwang'|'cong'|'normal', name: string }

```



\## 五行全局评估算法（computeWuxingAssessment）

```

输入：snapshot.influence（十神影响力）+ snapshot.dayStem（日主天干）

十神分为五组：A=印星，B=比劫，C=食伤，D=财星，E=官杀

生：A→B→C→D→E→A（delta=(Ea×Eb)/T，泄方-δ，受生方+δ）

克：B克D, C克E, D克A, E克B, A克C（互耗，双方各-δ）

基准评分：groups_after = shishenChainReact(groups_base)

  H = groups_after.A + groups_after.B + dayMasterEnergy

  K = groups_after.C + groups_after.D + groups_after.E

  baseScore = K===0 ? H : |H/K - 1|

候选映射：同我→B，生我→A，我生→C，我克→D，克我→E

对五个候选各加30至对应组，跑链式反应，计算：

  effect = (baseScore - candidateScore) / baseScore

闲神过滤：|effect| < baseScore×0.25 丢弃（相对阈值）

强度标签（maxAbsEffect = 所有剩余 |effect| 最大值）：

  effect > 0 且 > maxAbsEffect×0.50 → 关键用神

  effect > 0 且 ≤ maxAbsEffect×0.50 → 辅助用神

  effect < 0 且 |effect| > maxAbsEffect×0.50 → 强忌神

  effect < 0 且 |effect| ≤ maxAbsEffect×0.50 → 弱忌神

impacts：对比groups_base与候选链式反应后各组变化 → 对应十神对

WuxingAssessment: { wuxing, role, strengthLabel, effect, impacts }

```



\## 工作方式

\- 架构讨论/产品决策：在此Project对话进行

\- 代码施工：开新Claude Code会话，读CLAUDE.md后执行，完成后更新CLAUDE.md

\- 每次施工后必须更新CLAUDE.md并推送到GitHub

\- git commit必须用heiyi98账号（否则Vercel部署被blocked）

\- 启动开发：cd E:\\destinos\\apps\\web \&\& pnpm dev



\## 已完成模块

\- \[x] Monorepo基础结构

\- \[x] next-intl多语言框架

\- \[x] 路由中间件（自动语言重定向）

\- \[x] 设计系统（暗色模式，Apple配色，毛玻璃变量）

\- \[x] 双轴导航框架（左侧48px Dock + 顶部48px状态栏）

\- \[x] 顶部状态栏Context系统

\- \[x] 数据库Schema（users/profiles/snapshots/products/purchases）

\- \[x] Supabase Auth（Magic Link + Google OAuth）

\- \[x] Onboarding流程（日期/时间+城市+时区/性别，合并为三步）

\- \[x] 全球行政时区映射表（administrative-timezones.ts）

\- \[x] 落地页、登录页、认证回调

\- \[x] 仪表盘主页（八字命盘、五行五维图）

\- \[x] ProfileCard（姓名/生日/年龄/真太阳时）

\- \[x] ProfileSwitcher（支持全部档案滚动）

\- \[x] 档案管理（增删改，预填修复，含city/timezone/gender）

\- \[x] 账户管理、资产管理

\- \[x] packages/core 架构重构（bazi/psychology/astrology三模块）

\- \[x] 八字分析引擎（analyzeBazi，七步，BaziSnapshot七段式）

\- \[x] 真太阳时（行政时区映射，支持全球所有地区）

\- \[x] formatBaziDataSheet（全汉化，供Gemini使用）

\- \[x] Lemon Squeezy付费系统

\- \[x] AI解读API（Gemini 1.5 Pro）

\- \[x] 测算中心页面

\- \[x] 大五人格（120题单题模式，引擎，结果雷达图）

\- \[x] 大五题目内化（messages/{locale}/bigfive/questions.json，8语言）

\- \[x] 删除@alheimsins包

\- \[x] 西洋星盘（astronomy-engine，双模式，SVG图）

\- \[x] messages/按模块分文件结构

\- \[x] 算法架构重构（constants/utils 分离，消除重复代码）

\- \[x] 格局判定引擎（化气/专旺/从格四子类/正格十种）

\- \[x] 五行全局评估（WuxingAssessment：用神/忌神分类+强度标签+十神影响，替代旧单一用神）

\- \[x] preparePhase1Input（AI解读第一阶段数据组装，含强度标签+宫位标签+五行评估+十神字段+wuxing/yinyang+透出宫位；所有枚举值已汉化：dayStem/shishen/wuxing/yinyang/transparentThrough 均输出中文）

\- \[x] 旧快照懒迁移（自动补全 pattern/wuxingAssessment）

\- \[x] Snapshots RLS 性能优化

\- \[x] 大五人格 insert 静默失败修复



\## 待完成

\- \[ ] 解读prompt编写（用户负责，发给Gemini讨论后集成）

\- \[ ] ai\_reading\_translated字段（多语言翻译缓存）

\- \[ ] 大五人格结果解读文字

\- \[ ] 十天干人格档案文字（stem\_content表填充）

\- \[ ] 紫微斗数模块

\- \[ ] MBTI模块

\- \[ ] 论坛、商城、私信模块

\- \[ ] 中国版部署（阿里云）

```

