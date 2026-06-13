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

├── fortune.ts     ← 大运流年运势计算（computeFortuneImbalance/generateLifeChart）

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

旧快照清理（groups_base 算法已变更，旧 bazi 快照需清空后重算）：
```sql
DELETE FROM snapshots WHERE snapshot_type = 'bazi';
```



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

步骤1：透根判定（化神后扫描；墓库辰戌丑未藏干全部跳过，不得作为通根来源）

步骤1.5：十神挂载

步骤2：地支关系标注（三会/三合/半合/拱合/六合/六冲/刑/害/破，只标注）自刑（辰午酉亥）需同一地支在四柱中出现 ≥2 次才触发，出现1次不标注

步骤3：月令系数（斐波那契推导，8:5:3:2:1 ÷ 4，锚定得令=2.00）

&#x20; 得令×2.00 | 近旺×1.25 | 泄气×0.75 | 受制×0.50 | 失令×0.25

步骤4：独立能量计算（通根系数分配规则）

&#x20; 通根系数 = 藏干基础分 ÷ 10（上限截断为3，每条通根单独计算）

&#x20; 天干：energy = 30 × 月令系数 × (1 + 分配通根系数)

&#x20;   分配通根系数 = totalTougenCoeff / 同五行天干数

&#x20; 藏干：energy = 藏干基础分 × 月令系数（去掉透出乘数）

步骤5：合绊/墓库标记（保留能量，对外输出=0，日干例外）墓库全锁：辰戌丑未所有藏干（本气/中气/余气）outputEnabled=false，不检查对应天干

步骤6：宫位距离权重（勾股定理，日干为原点）

&#x20; 年干0.50 | 年支0.45 | 月干1.00 | 月支0.71

&#x20; 日支1.00 | 时干1.00 | 时支0.71

步骤7：十神影响力总值 = Σ(节点能量)（宫位权重已移除，influence = energy）

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

输入：snapshot.energy（energyNodes）+ snapshot.shishen（shishenMap）+ snapshot.dayStem（日主天干）

十神分为五组：A=印星，B=比劫，C=食伤，D=财星，E=官杀

groups_base：对 outputEnabled=true 的节点按十神分组求 energy 之和；DayMaster 节点并入比劫组（B）

生：A→B→C→D→E→A
  base = AB/(A+B)（A+B=0时base=0；势均力敌为相冲的传统定义）
  生方损耗 -base；受生方获得 +base×5/3（近旺1.25÷泄气0.75）

克：B克D, C克E, D克A, E克B, A克C（A克B）
  克方耗损 -AB²/(A+B)²×1；受克方损失 -A²B/(A+B)²×2（受制0.50÷失令0.25）

基准失衡：直接使用 groups_base（无链式反应）

  H = groups_base.A + groups_base.B（B 已含日主能量）

  K = groups_base.C + groups_base.D + groups_base.E

  baseScore = |H - K|

候选映射：同我→B，生我→A，我生→C，我克→D，克我→E

对五个候选各加30至对应组，只跑直接涉及该组的生/克关系（每组最多4条，不跑完整链式反应）：

  newImbalance = |新H - 新K|

方向判定：

  newImbalance < baseScore → 用神

  newImbalance ≥ baseScore → 忌神

用神强度：

  关键优化值 = baseScore - min(所有用神的newImbalance)

  新失衡最小者 → 关键用神（唯一）

  其余用神：optimization = baseScore - newImbalance

    optimization ≥ 关键优化值×0.5 → 强用神

    optimization < 关键优化值×0.5 → 弱用神

忌神强度：

  最大劣化值 = max(所有忌神的newImbalance) - baseScore

  deterioration = newImbalance - baseScore

    deterioration ≥ 最大劣化值×0.5 → 强忌神

    deterioration < 最大劣化值×0.5 → 弱忌神

effect 字段：用神存 optimization（正值），忌神存 -deterioration（负值）

impacts：对比 groups_base 与候选直接关系后各组变化 → 对应十神对

WuxingStrengthLabel: '关键用神' | '强用神' | '弱用神' | '强忌神' | '弱忌神'

WuxingAssessment: { wuxing, role, strengthLabel, effect, impacts }

特殊格局短路（getSpecialPatternAssessment，跳过上述平衡算法）：

  入口：snapshot.pattern.category !== 'normal' 时直接返回，不跑生克博弈

  五组对应五行（以某五行为"日主"）：B=同我 A=生我 C=我生 D=我克 E=克我

  专旺格（五格统一，化气格以化神为新日主套用同一规则）：

    关键用神=比劫(B) 强用神=食伤(C) 弱用神=印星(A) 强忌神=官杀(E) 弱忌神=财星(D)

  从格（按 name 区分，无弱用神，弱忌神占两组）：

    从儿格：关键=食伤 强=财星 强忌=印星 弱忌={官杀,比劫}

    从财格：关键=财星 强=食伤 强忌=比劫 弱忌={印星,官杀}

    从杀格：关键=官杀 强=财星 强忌=食伤 弱忌={比劫,印星}

    从强格：关键=印星 强=比劫 强忌=财星 弱忌={食伤,官杀}

  化气格：化神五行取自 relations.tianGanHe 中 result==='ZhenHua' 且涉及 DayStem 的记录的 huashen 字段
    （不可用 pattern.name 解析——huaqi 的 name 固定为'化气格'，不区分五行）

  effect 固定映射：关键用神1.0 强用神0.6 弱用神0.3 强忌神-0.6 弱忌神-0.3；role 由 effect 正负决定；impacts 留空

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

\- \[x] 旧快照懒迁移（自动补全 pattern；wuxingAssessment 不再存储，改为实时计算）

\- \[x] Snapshots RLS 性能优化

\- \[x] 大五人格 insert 静默失败修复
\- \[x] 大五提交端点未触发修复（page.tsx handleSubmit：currentProfile 时序未就绪导致 `if (!currentProfile) throw` 提前阻断 fetch，POST /api/psychology/bigfive 从未发出；改用 profileIdRef（useRef）+ useEffect 在 currentProfile?.id 变化时同步缓存，handleSubmit 直接读 profileIdRef.current 取 profile\_id，为空才报错——弃用「查 is\_self=true 默认档案」的兜底方案，因为会把结果存到错误档案下；不改动按钮渲染条件）

\- \[x] debug API路由（apps/web/src/app/api/debug/phase1-input/route.ts，仅开发环境，GET ?snapshotId=xxx 返回纯中文文本，Content-Type: text/plain）

\- \[x] preparePhase1Input 重写为纯文本输出（string）：日主→五行强弱（极强/偏强/中/偏弱/极弱/缺失）→十神（强度标签极强/强/中/弱/极弱/缺失；TianGan只输出通根宫位或无通根；CangGan透出/墓库锁闭/未透出）→干支关系（天干合/天干冲格式不变；地支关系格式{宫位}{十神}{阴阳}{五行}，不附加note）→用神忌神

\- \[x] wuxingAssessment 实时计算（dashboard API 不再读取快照中存储的 wuxingAssessment，每次返回前调用 computeWuxingAssessment(baziSnapshot) 实时计算并覆盖；computeWuxingAssessment 已从 @mindo/core 正确导出）
- \[x] computeWuxingAssessment 重构：groups_base 改用 energyNodes 原始能量（outputEnabled 节点按十神分组，DayMaster 并入比劫组 B）；生克公式改为 delta=(X×Y)/(X+Y)，X+Y=0 时 delta=0，删除 T 依赖；H=A+B（含日主），K=C+D+E
- \[x] 生克公式升级：生方损耗 base，受生方获得 base×5/3（近旺÷泄气）；克方耗 AB²/(A+B)²，受克损 A²B/(A+B)²×2（受制÷失令）
- \[x] 全算法文件补注释：constants.ts（藏干基础分来源、月令系数斐波那契推导已有、宫位权重勾股公式）；analysis.ts（通根系数÷10来源、天干/藏干能量公式）；yongshen.ts（生克基础量公式、受生5/3权重、受克2权重、基准失衡定义、强弱50%分界）
- \[x] computeWuxingAssessment 特殊格局短路（getSpecialPatternAssessment）：snapshot.pattern.category !== 'normal' 时跳过五行平衡博弈，按格局规则直接给标签——专旺格统一规则（化气格以 relations.tianGanHe 中 ZhenHua 记录的 huashen 字段作为新日主套用同规则，而非解析 pattern.name，因为 huaqi 的 name 固定为'化气格'不区分五行）/从格按 name 区分四子类；effect 固定映射 1.0/0.6/0.3/-0.6/-0.3；computeWuxingAssessment 入参 Pick 新增 pattern/relations，toBaziSnapshot 同步传入
- \[x] 移除宫位权重（analysis.ts + types.ts）：步骤七 influence 改为直接等于 energy，删除 GONGWEI_WEIGHT 引用；ShiShenInfluenceGroup.nodes 删除 weight 字段；CLAUDE.md 算法规格同步更新
- \[x] 自刑触发条件修正（analysis.ts）：辰/午/酉/亥 须在四柱中出现 ≥2 次才标记 Xing（自刑）；出现1次不产生任何刑关系；positions 列出全部出现宫位
- \[x] 墓库全锁（analysis.ts）：辰戌丑未所有藏干（本气/中气/余气）一律 MuKuLocked=true、outputEnabled=false，不再检查对应天干是否存在；透根扫描同步排除墓库藏干（touGenResults 循环开头 continue）
- \[x] 墓库六冲开库（analysis.ts）：辰戌互冲/丑未互冲时，被冲墓库所有藏干 isMuKuLocked=false、outputEnabled=true，可作为通根来源；透根扫描同步检测六冲开库
- \[x] getBranchPos bug 修复（analysis.ts）：getBranchPos 改为 getAllBranchPos，返回 GongWeiPos[]，所有 positions 改用 flatMap，修复重复地支只映射第一个宫位的 bug
- \[x] 合解冲（analysis.ts + fortune.ts）：三合/六合参与支免疫六冲标签，diZhiRelations 过滤掉被合化解的六冲
- \[x] 三会/三合改写藏干基础分（analysis.ts + fortune.ts）：化神藏干 baseScore→30，其余→0；三会优先（先到先得 Map）；步骤一结束、步骤二之前执行
- \[x] 三会局免疫克（yongshen.ts）：computeCandidateEffect 新增 immuneGroups 参数；三会局五行受克方跳过克损计算（旺神不可克）
- \[x] fortune.ts 新建：LinPillar/FortuneGroupEnergies/FortuneResult/YearScore/LifeChartData 类型；computeFortuneImbalance（十步算法：月令锚定→合并地支→关系检测→六冲开库→合会改写藏干→天干五合→构建藏干节点→通根重算→能量计算→|H-K|）；generateLifeChart（遍历 DestinyTimeline 生成人生K线数据）；临入支六冲自动成立/临入干参与五合直接ZhenHua/临入节点免疫被克
- \[x] fortune.ts 临入节点能量公式修订：临入天干 = 30×(1+通根系数_from_own_branch)（只扫描所属临入支藏干，baseScore÷10累加，上限3，移除月令系数）；临入藏干 = baseScore（移除月令系数）；本命天干/本命藏干公式不变
- \[x] life_timeline Supabase 表（等待在控制台执行 SQL）
- \[x] preparePhase1Input 五行强弱标签改为6档百分比映射（wuxingStrength，替代旧 simpleStrength 均值倍数法）：ratio = 该五行能量 ÷ 五行总能量，≥50%极强 / 30-50%偏强 / 15-30%中 / 5-15%偏弱 / >0且<5%极弱 / =0缺失；total=0 时全部兜底输出缺失
- \[x] fortune.ts 辅助函数（getMonthPillar/getDayPillar）：封装 lunar-typescript 依赖，取每月15日正午锚定月支，从 packages/core 导出供前端 API 路由调用
- \[x] dashboard/route.ts 增加 life_timeline 生成：调用 generateDestinyTimeline + generateLifeChart，写入 life_timeline 表，响应增加 lifeTimeline 字段；重构为单一 return 路径（let baziSnapshot）
- \[x] fortune/daily API（GET /api/fortune/daily?profileId=&date=YYYY-MM-DD）：返回 { date, imbalance, energies, dayun, liuyear, liuyue, liuri }；四柱临入=大运+流年+流月+流日
- \[x] fortune/kline API 已删除：月度数据内嵌至 life_timeline.years[i].months（MonthScore[]），每年12个月度数据在 generateLifeChart 时预计算写入
- \[x] preparePhase1Input 天干合化标注：tianGanHe result==='ZhenHua' 改为 {宫位}{天干}{五行} × {宫位}{天干}{五行} 合化{huashen中文}格式（huashen Wuxing枚举→中文）；HeBan/ZhengHe 保持原有格式不变
- \[x] preparePhase1Input 地支会方标注：diZhiRelations type==='SanHui'|'SanHe' 在行末追加 会方{wuxing中文}；LiuHe/BanHe/GongHe/刑冲破害 不追加
- \[x] fortune.ts MonthScore 新增：month/liuyueStem/liuyueBranch/imbalance/energies；YearScore.months 字段；generateLifeChart 月度预计算（大运+流年+流月三柱临入，12个月per年）；/api/fortune/kline 路由删除（月度数据已内嵌 years[i].months）
- 注意：历史 life_timeline 数据需在 Supabase 控制台执行 DELETE FROM life_timeline; 清空后重新生成
- \[x] 人生K线图组件（LifeKlineCard.tsx）：缩略SVG折线图卡片（点击展开）+ LifeKlineModal全屏（recharts ComposedChart：大运色块背景ReferenceArea/基准线ReferenceLine/Customized蜡烛图层/五条能量折线/自定义Tooltip/图例toggle）；使用useXAxisScale/useYAxisScale recharts v3 hooks在CandlestickLayer内读取轴比例函数，阳线=绿#10b981/阴线=红#f43f5e
- \[x] ui.json kline键（8语言）：bijie/shishang/caixin/guansha/yinxing/close（dashboard.bazi.kline）
- \[x] recharts 安装至 apps/web



\## 待完成

\- \[x] 测算中心页面改造（分类卡片网格：命理/心理/占卜，完成状态检测，active/coming_soon样式区分）

\- \[x] 八字主页（/dashboard/divination/bazi）：命盘+每日运势+五行雷达+日主小人+付费报告+人生K线图占位

\- \[x] 路由结构扩展：/{locale}/dashboard/divination/bazi/

\- \[x] assessments/index.json 扩展（8语言：liuyao/tarot/geomancy名称 + divination.bazi/ziwei/western/bigfive描述）

\- \[x] ui.json 扩展（8语言：divination.oracle分类 + dashboard.bazi.unlockReading/viewReading/klineTitle/wuxing）

\- \[ ] 解读prompt编写（用户负责，发给Gemini讨论后集成）

\- \[ ] ai\_reading\_translated字段（多语言翻译缓存）

\- \[ ] 大五人格结果解读文字

\- \[ ] 十天干人格档案文字（stem\_content表填充）

\- \[ ] 紫微斗数模块

\- \[ ] MBTI模块

\- \[ ] 论坛、商城、私信模块

\- \[ ] 中国版部署（阿里云）

```

