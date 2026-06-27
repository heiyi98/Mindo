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
- 外层容器只有 `width:100% height:100%`，不设任何固定像素/aspectRatio
- 视觉内容用SVG（`viewBox`固定，`width/height=100%`等比缩放）

### 文件结构
```
components/
  dashboard/         ← 导航框架层（ProfileSwitcher, ProfileEditModal）
  modules/           ← 功能模块卡片（原divination/）
    bazi/
      BaziChartCard.tsx     COLS=4 ROWS=2
      WuxingRadarCard.tsx   COLS=2 ROWS=2
      DayMasterCard.tsx     COLS=2 ROWS=3
      BaziReadingCard.tsx   COLS=1 ROWS=2
    bigfive/
      BigFiveChart.tsx      COLS=2 ROWS=2
    western/
      StarChartWheel.tsx    COLS=3 ROWS=3
  common/            ← 通用卡片
    ProfileCard.tsx         COLS=2 ROWS=1（SVG渲染，文字等比缩放）
config/
  dashboard-widgets.ts  ← 卡片注册表（WIDGET_REGISTRY/DEFAULT_LAYOUT）
```

### 页面布局规范
所有模块页面统一规范：
- 容器：`max-w-xl mx-auto`（576px），`px-4 py-6`
- ref挂外层div，ResizeObserver计算cellSize
- cellSize公式：`Math.min(w - 32, 576)`，4列

### 仪表盘
- 6列CSS Grid，格子正方形（cellSize = (容器宽 - 5×16) / 6）
- 拖拽：useDraggable + useDroppable，onDragMove实时计算hoverCell
- 落下时碰撞解决：被拖卡片优先，冲突卡片按左上角优先排序找空位
- 半透明高亮（整块虚线框，zIndex:30）显示落点预览
- 布局持久化：users.dashboard_layout JSONB
- 编辑模式：右侧264px抽屉，主区域paddingRight让出空间

## 多语言规则（铁律，不得违反）
1. 任何组件里禁止出现硬编码的中文或英文用户可见字符串
2. 所有文字必须通过 useTranslations() 或 getTranslations() 读取
3. 翻译文件结构：apps/web/messages/{locale}/ui.json（基础UI）+ 模块子目录
   - messages/{locale}/bazi/index.json（八字命盘，namespace: 'bazi'）
   - messages/{locale}/bigfive/index.json（大五主体）
   - messages/{locale}/bigfive/questions.json（120道题目）
   - messages/{locale}/western/index.json（西洋星盘）
   - messages/{locale}/assessments/index.json（测算注册表）
4. 当前支持语言：en（默认）、zh（简体）、zh-Hant（繁体）、fr、es、ja、ko、it、de
5. 新增功能时必须同步更新所有语言文件，至少en和zh必须完整

## 路由结构
```
/{locale}/                              → 落地页
/{locale}/dashboard/                    → 仪表盘主页（6列网格，可自定义）
/{locale}/dashboard/divination/         → 测算中心
/{locale}/dashboard/divination/bazi/   → 八字主页
/{locale}/dashboard/divination/bigfive/ → 大五人格
/{locale}/dashboard/divination/western/ → 西洋星盘
/{locale}/dashboard/profile/            → 账户管理
/{locale}/dashboard/profile/profiles/  → 档案管理
/{locale}/dashboard/profile/assets/    → 资产管理
/{locale}/dashboard/profile/account/  → 账户安全
/{locale}/dashboard/forum/             → 论坛（待开发）
/{locale}/dashboard/shop/              → 商城（待开发）
/{locale}/dashboard/messages/          → 私信（待开发）
/{locale}/onboarding/                  → 引导流程
/{locale}/auth/login/                  → 登录页
/{locale}/auth/set-password/           → 新用户注册后设置密码
/{locale}/auth/reset-password/         → 忘记密码后重置密码
```

## 架构铁律
1. 模块完全解耦：任何单一模块的修改不得影响其他模块
2. AI调用必须走后端API路由，禁止在前端暴露任何Prompt
3. 所有颜色和间距必须引用设计系统变量，禁止硬编码
4. 计算结果必须存为快照，禁止重复触发计算
5. packages/core 禁止引入任何前端框架依赖
6. 新增数据库字段必须先执行SQL再写代码
7. 卡片组件不得有固定像素尺寸，只能有SVG viewBox和百分比

## packages/core 目录结构（已锁定）
```
packages/core/src/bazi/
├── constants.ts   ← 所有静态数据表
├── utils.ts       ← calcShiShen / isAdjacent 等共享工具
├── engine.ts      ← 排盘 + 真太阳时
├── analysis.ts    ← 七步分析引擎
├── pattern.ts     ← 格局判定
├── yongshen.ts    ← 五行全局评估（computeWuxingAssessment）
├── preparePhase1Input.ts ← AI解读第一阶段输入准备
├── fortune.ts     ← 大运流年运势计算
├── timeline.ts    ← 大运流年
└── types.ts       ← 全部类型定义
```

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
设计依据：以比肩为基准单位1。墓库本气（≈18）÷10≈1.8，符合"1比肩<1墓库气"；
余气（≈7）÷10≈0.7，2个比肩<1余气；纯气（30）÷10=3，3比肩<1长生纯气。

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
五行相生顺序：A→B→C→D→E→A（印生比，比生食，食生财，财生官，官生印）。
三会局五行免疫被克效果（旺神不可克）。

**分级阈值**（均相对 baseScore）：
```
|effect| < baseScore × 10%  → 闲神（无命理依据，设计决策）
|effect| ≥ baseScore × 50%  → 强用神 / 强忌神
|effect| < baseScore × 50%  → 弱用神 / 弱忌神
effect最大的用神             → 关键用神
```

**WuxingStrengthLabel 枚举**：
`'关键用神' | '强用神' | '弱用神' | '闲神' | '弱忌神' | '强忌神'`

**WuxingAssessment.role 枚举**：
`'yongshen' | 'jishen' | 'xianshen'`

**特殊格局**（化气/专旺/从格）：跳过平衡算法，直接按格局规则输出标签。

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
- users（含vip_tier: free/lifetime/pro，dashboard_layout JSONB）
- profiles（含birth_date/time/lat/lng/place_name/timezone/gender/is_self）
- bazi_snapshots
- astrology_snapshots
- bigfive_assessments（domain_scores/facet_scores/region字段）
- bigfive_norms（region/gender/age_group常模）
- life_timeline（baseline_imbalance/baseline_energies/years JSONB）
- products / purchases

注意：snapshots表已废弃。档案编辑自动清空bazi_snapshots+astrology_snapshots+life_timeline。

## 五行颜色规范（单一真相）
```
Wood: #388E3C
Fire: #D32F2F
Earth: #F57F17
Metal: #757575
Water: #1976D2
```

## 人生运势图（LifeKlineCard）
- 暂时隐藏（注释在bazi/page.tsx），待算法完善后恢复
- 算法问题：三会触发改写藏干baseScore导致能量异常放大，待解决
- 现有功能：大运/大运流年两种精度切换，五条能量折线（bijie/shishang/caixin/guansha/yinxing）

## 工作方式
- 架构讨论/产品决策：在此Project对话进行
- 代码施工：开新Claude Code会话，读CLAUDE.md后执行，完成后更新CLAUDE.md
- 每次施工后必须更新CLAUDE.md并推送到GitHub
- git commit必须用heiyi98账号（否则Vercel部署被blocked）
- 启动开发：cd E:\destinos\apps\web && pnpm dev

## 已完成模块
- [x] 全部基础架构（Monorepo/路由/多语言/设计系统/导航框架）
- [x] Supabase Auth（Magic Link + Google/Facebook OAuth + 密码登录）
- [x] Onboarding流程
- [x] 八字引擎（七步分析/格局判定/五行评估/AI数据准备）
- [x] 大五人格（120题/引擎/雷达图翻转玫瑰图/常模匹配/T分）
- [x] 西洋星盘（SVG星盘图）
- [x] 付费系统（Lemon Squeezy）
- [x] AI解读API（Gemini）
- [x] 仪表盘6列网格（自定义拖拽/碰撞解决/布局持久化）
- [x] 卡片架构重构（modules/目录，卡片自治，profileId唯一prop）
- [x] ProfileCard SVG化（文字等比缩放）
- [x] 测算中心页面（三类卡片：命理/心理/占卜，自定义SVG图标）
- [x] 八字主页布局（4卡片，max-w-xl）
- [x] 大五页面布局（雷达图+胶囊列表，max-w-xl）
- [x] 用神算法重构（链式反应系数/闲神分类/强弱阈值）

## 待完成
- [ ] 解读prompt编写
- [ ] ai_reading_translated字段（多语言翻译缓存）
- [ ] 人生运势图算法修复（三会改写藏干问题）
- [ ] 日主小人PNG图片（/public/images/daymasters/{pinyin}.png）
- [ ] 大五人格结果解读文字
- [ ] 十天干人格档案文字
- [ ] 紫微斗数模块
- [ ] MBTI模块
- [ ] 论坛、商城、私信模块
- [ ] 中国版部署（阿里云）