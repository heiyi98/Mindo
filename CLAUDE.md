# Mindo — 项目记忆文件

## 项目简介

全球化赛博玄学Web App，集命理测算、心理测量、社区论坛、社交匹配、周边商城于一体。

- 生产环境URL：https://mindo-web.vercel.app
- GitHub仓库：https://github.com/heiyi98/Mindo
- 本地路径：E:\destinos

## 模块文档索引（每次施工先看这里，确定这次任务还需要额外读哪份文档）

`CLAUDE.md` 只负责通用规矩、目录结构、路由、踩过的通用技术坑——**不含任何具体模块的算法/数据库表/业务逻辑细节**。涉及以下模块的施工，除了 `CLAUDE.md`，必须同时读对应的文档：

| 模块 | 文档 |
|---|---|
| 八字（算法/AI报告管道/PDF导出） | `Mindo-算法-八字.md` |
| 大五人格（算法/颜色系统） | `Mindo-算法-大五.md` |
| 认证/Onboarding/账户安全 | `Mindo-认证与账户.md` |
| 数据库全部表结构 | `Mindo-数据库.md` |
| 片语模块 | `Mindo-片语.md` |
| 开发环境/部署/第三方服务配置 | `Mindo-工作栈与服务.md` |
| 内容库（Codex） | `Mindo-内容库.md` |

西洋星盘、紫微斗数、MBTI、论坛、商城、私信——尚未拆出独立文档，做到哪个模块再建哪个模块的文档，不要提前占位建空文件。

## 当前技术栈

- Monorepo工具：pnpm workspace + Turborepo
- 前端：Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion
- 数据请求/缓存：TanStack Query（`@tanstack/react-query`），`QueryClientProvider` 在 `apps/web/src/app/[locale]/layout.tsx`，Provider组件在 `components/providers/QueryProvider.tsx`。片语模块+若干其他模块（档案/仪表盘/八字卡片/大五/西洋星盘/私信/用户主页）已改造为使用它（`useQuery`/`useMutation`/`useInfiniteQuery`），支付/AI报告生成链路/账户认证与安全这几类高风险流程明确排除在外，未改造，仍是手写fetch
- 国际化：next-intl 4.x
- 数据库：Supabase（PostgreSQL + RLS），项目ID `wsbskrgrkajnzzgpcfws`，表结构见 `Mindo-数据库.md`
- 图标：lucide-react（部分模块使用自定义SVG图标）
- 内容库（Codex）：fumadocs-core + fumadocs-mdx（不用 fumadocs-ui，UI自建），详见 `Mindo-内容库.md`
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

### apps/web 目录结构

```
apps/web/
├── src/
│   ├── app/
│   │   ├── [locale]/               ← 多语言页面
│   │   │   ├── page.tsx            ← 落地页
│   │   │   ├── onboarding/         ← 引导流程
│   │   │   ├── auth/               ← 登录/错误页
│   │   │   ├── u/[handle]/         ← 通用社交主页（关注/私信入口）
│   │   │   └── dashboard/
│   │   │       ├── (os)/           ← 路由组（共享Dock+TopBar导航框架）
│   │   │       │   ├── page.tsx
│   │   │       │   ├── assessments/
│   │   │       │   ├── profile/
│   │   │       │   ├── forum/      ← 占位
│   │   │       │   ├── shop/       ← 占位
│   │   │       │   └── messages/
│   │   │       └── mind-cards/     ← 片语模块，独立于(os)之外，见Mindo-片语.md
│   │   │   └── codex/              ← 内容库（Codex），独立于(os)之外，见Mindo-内容库.md
│   │   └── api/                    ← 后端接口，按模块分目录
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   │   └── source.ts               ← 内容库数据读取层（fumadocs loader），见Mindo-内容库.md
│   ├── i18n/
│   └── config/
├── content/                        ← "人手写、要多语言、要版本追溯的长文本内容"统一存放层，
│   │                                  与src/（程序代码）、public/（静态资源）平级
│   ├── codex/                      ← 内容库词条源文件（MDX），已建成，见Mindo-内容库.md
│   ├── blog/                       ← 未来博客内容，尚未建（做到再建，不要提前占位）
│   └── legal/                      ← 未来服务条款/隐私政策等法律文本，尚未建，同样需要9语言+修改留痕
└── messages/                       ← 多语言词典，按locale/模块分目录

```

### packages/core 目录结构（已锁定）

```
packages/core/src/
├── bazi/         ← 详见 Mindo-算法-八字.md
├── psychology/bigfive/  ← 详见 Mindo-算法-大五.md
├── social/       ← 片语相似度引擎，详见 Mindo-片语.md
├── astrology/western/
└── time/         ← 通用时间引擎（真太阳时/行政时区双模式），紫微等未来模块共用，
                     禁止在各模块内部重写，见下方"关键教训"

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
    bazi/            ← 见Mindo-算法-八字.md
    bigfive/         ← 见Mindo-算法-大五.md
    western/
    mindcards/       ← 见Mindo-片语.md
  common/            ← 通用卡片
    ProfileCard.tsx           COLS=2 ROWS=1（SVG渲染，文字等比缩放）
    ValveLogo.tsx             ← 阀门动画logo，单侧渲染，side='left'|'right'，isOpen控制展开/闭合
    ValveConverge.tsx         ← 复用ValveLogo开关状态机，direction='open'|'close'
    MindoMark.tsx             ← 静态完整logo，用于Dock等导航场景（不参与动画）
  os/
    Dock.tsx                  ← 左侧导航栏，profile图标用lucide的User；悬停显示模块名用'nav'翻译命名空间
    LanguageSwitcher.tsx      ← 导出两个组件：LanguageSwitcher（落地页/onboarding用）和LanguageSettingRow（profile页用）——两者图标故意不同，不要统一
  theme/
    ThemeProvider.tsx         ← 全局主题Context（light/dark/system）
    ThemeToggle.tsx           ← 三段式主题切换组件
  providers/
    QueryProvider.tsx         ← TanStack Query的QueryClientProvider
config/
  dashboard-widgets.ts  ← 卡片注册表（WIDGET_REGISTRY/DEFAULT_LAYOUT/repackLayout）
contexts/
  GridContext.tsx       ← 卡片展开信号桥接（expandCard/collapseCard/expandedCards）

```

**注意**：`PostOnboardingRevealContext.tsx`、`PostOnboardingReveal.tsx` 曾经存在（注册成功后logo飞入Dock的动画），**已被产品决策彻底移除**，不要重新创建。

### 页面布局规范

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
- 被展开卡片x范围内且在其下方的卡片row后移，x不重叠的卡片坐标不变
- 无Provider时静默失败，卡片正常渲染

### 档案管理页面

- 拖拽排序：`@dnd-kit/core` + `@dnd-kit/sortable`，静默保存（PATCH order_index）
- 账户本人档案（is_self）永远锁在最顶端，不参与排序
- 出生时间显示：统一按 `substring(0, 5)` 截取显示真太阳时，分钟是否已知不影响前端展示

## 多语言规则（铁律，不得违反）

1. 任何组件里禁止出现硬编码的中文或英文用户可见字符串
2. 所有文字必须通过 useTranslations() 或 getTranslations() 读取
3. 翻译文件结构：apps/web/messages/{locale}/ui.json（基础UI）+ 各模块子目录（bazi/bigfive/western/assessments/mindcards）
4. 当前支持语言：en（默认）、zh（简体）、zh-Hant（繁体）、fr、es、ja、ko、it、de
5. 新增功能时必须同步更新所有语言文件，至少en和zh必须完整
6. `nav` 命名空间（ui.json里）：home/assessments/forum/shop/messages/profile，Dock悬停提示复用这个，不要新建重复命名空间
7. **待办**：`onboarding.timePicker.unknownMinute` 这个键目前ui.json里没有正式收录，靠代码里的`defaultMessage`兜底
8. **繁体中文字体地区决策**：`zh-Hant` 涉及字体渲染时，统一使用 Source Han Sans/Serif 的 **TW（台湾）子集**（`@fontsource/noto-sans-tc`），不使用 HK（香港）子集
9. **待办**：片语模块 `comments.*` 翻译键只有zh语言文件有，其余8种语言缺失，需要补齐
10. **多语言文件合并机制**：next-intl运行时动态合并多个JSON文件，`i18n/request.ts`里的`loadMessages()`递归合并各模块的翻译子目录（不是所有文字挤在一个巨大的ui.json里）

## 测算模块注册（跨模块通用机制）

- 单一数据源：`src/config/assessments.ts`，八字/大五/西洋星盘这几个测算模块的元信息（名称/描述/状态/路由）都在这里维护，不在各模块自己的代码里各自硬编码一份
- `/api/assessments/status`根据这份配置查询各模块完成状态，新增测算模块时先在这里注册，不要绕过

## 路由结构

```
/{locale}/                              → 落地页
/{locale}/dashboard/                    → 仪表盘主页（6列网格，可自定义）
/{locale}/dashboard/assessments/        → 测算中心
/{locale}/dashboard/assessments/bazi/   → 八字主页
/{locale}/dashboard/assessments/bigfive/ → 大五人格
/{locale}/dashboard/assessments/western/ → 西洋星盘
/{locale}/dashboard/assessments/bazi/reading → 八字AI报告长页（?readingId=...）
  ⚠️ 物理位置不在(os)路由组底下——故意搬出去的，避免报告页出现导航栏
/{locale}/dashboard/profile/            → 账户管理
/{locale}/dashboard/profile/profiles/   → 档案管理（拖拽排序）
/{locale}/dashboard/profile/assets/     → 资产管理（所有付费报告）
/{locale}/dashboard/profile/account/    → 账户安全
/{locale}/dashboard/mind-cards/         → 片语主页，物理位置不在(os)路由组底下
/{locale}/dashboard/mind-cards/profile/{handle} → 片语个人主页（自己/别人共用同一路由，
  组件内部判断isOwn，见Mindo-片语.md）
/{locale}/dashboard/forum/              → 论坛（待开发）
/{locale}/dashboard/shop/               → 商城（待开发）
/{locale}/dashboard/messages/           → 私信
/{locale}/codex/...                     → 内容库（Codex），物理位置不在(os)路由组底下，见Mindo-内容库.md
/{locale}/u/[handle]/                   → 通用社交主页（关注状态、发私信入口）
/{locale}/onboarding/                   → 引导流程
/{locale}/auth/login/                   → 登录页
/{locale}/auth/set-password/            → 新用户注册后设置密码
/{locale}/auth/reset-password/          → 忘记密码后重置密码

```

`(os)` **路由组说明**：括号目录不影响网址，只影响"继承哪个layout"。`(os)`底下的页面共用同一个layout.tsx（含Dock+TopBar）。任何不该有导航栏的独立页面（报告页、片语模块），应该放在`(os)`外面，会自动跳过这层布局、直接继承根布局。这是路由组的标准用法，不是bug。

## 架构铁律

1. 模块完全解耦：任何单一模块的修改不得影响其他模块
2. AI调用必须走后端API路由，禁止在前端暴露任何Prompt
3. 所有颜色和间距必须引用设计系统变量，禁止硬编码
4. 计算结果必须存为快照，禁止重复触发计算
5. packages/core 禁止引入任何前端框架依赖
6. 新增数据库字段必须先执行SQL再写代码
7. 卡片组件不得有固定像素尺寸，只能有SVG viewBox和百分比
8. 含中文的文件禁止用PowerShell -replace修改，必须发给Claude输出后替换
9. **架构级改名/重构必须搭配全项目搜索核查**：任何时候重命名文件夹、导出符号、路由路径，必须全局搜索所有引用点确认零残留，再收尾——这类操作极易漏改分散在各处的硬编码路径字符串，是通病，不是哪次会话特别不可靠

## 工作方式

- 架构讨论/产品决策：在此Project对话进行
- 代码施工：开新Claude Code会话，读CLAUDE.md（以及模块文档索引指向的相关文档）后执行，完成后更新对应文档
- 每次施工后必须更新相关文档并推送到GitHub
- git commit必须用heiyi98账号（否则Vercel部署被blocked）
- 启动开发：cd E:\destinos\apps\web && pnpm dev
- 含中文的文件禁止用PowerShell直接修改，必须发给Claude输出后替换
- **架构级改名/重构收尾必须做全局搜索**，不要只改"报错提示的那一个文件"就收工
- **用户是vibe coder，不读代码语法**：每次交付必须是可以直接替换的全量文件/完整代码/明确指令，不给片段、不给diff、不给"大概这样改"这种需要用户自己判断怎么拼接的东西
- **跟用户对齐颗粒度/讨论方案时，尽量用人类语言，不用工程术语**，除非用户特别要求用技术语言。解释一个技术决策时，优先用类比/大白话说清楚"这样做的效果是什么、为什么选这个"，不是罗列技术细节
- **用户的整体工作倾向是"极简+模块化"**：文档、代码结构都要往"职责单一、容易找到该改哪里"这个方向收敛，宁可拆得细一点，也不要让单个文件/文档变成什么都往里塞的大杂烩

## 关键教训

- PowerShell -replace命令会损坏UTF-8中文字符，含中文的文件必须发给Claude修改后输出
- Turbo远程缓存会掩盖TypeScript错误，新建Vercel项目时会暴露历史积累的错误
- Noto_Sans_SC/TC 不接受 subsets 参数，直接省略即可
- vercel.json的cron表达式Hobby账号只支持每天一次（`0 0 * * *`）
- Vercel webhook偶发失效时，删除重建项目是最彻底的解法
- @react-pdf/renderer中文换行：必须用hyphenationCallback把每个字符拆开，不能用useCallback（缓存问题），字体必须用.ttf格式，路径必须用window.location.origin拼完整URL
- **engine → baziEngine 重命名（已完成）**：`packages/core/src/bazi/engine.ts` 导出的对象从 `engine` 改名为 `baziEngine`。**禁止在任何新代码里 import** `engine` **from** `@mindo/core`**，正确名字是** `baziEngine`
- **divination → assessments 全局改名（已完成）**：这类改名极易漏改分散在各处的硬编码路径字符串，改名后必须做一次全局搜索旧名字确认零残留
- **CSS自定义属性在calc()里必须带单位**：`--ext-len`这类自定义属性如果设成纯数字（无px），`calc(-1 * var(--ext-len))`算出来的是无量纲数值，某些浏览器场景下会被判定为非法声明整条丢弃——不是"能不能用变量"的问题，是"变量值要不要带单位"的问题
- **useEffect vs useLayoutEffect**：凡是"设置好某个值/状态之后，希望第一帧绘制就已经是正确结果，不能有一帧是错的"的场景，必须用useLayoutEffect，用useEffect会导致肉眼可见的一帧闪烁或错误初始状态
- `.single()` **vs** `.maybeSingle()`：Supabase查询如果预期"可能查不到行"，必须用`maybeSingle()`，`single()`在查不到时会把error静默丢在解构结果里不处理
- **sessionStorage不跨标签页共享，localStorage跨标签页共享**：这个区别可以用来分辨"同一次操作的延续"和"完全不同的人/时机"
- **手动删测试数据必须走Authentication→Users删除，不要直接删数据表里的行**：`public.users`没有自己的外键指向`auth.users`，直接删数据表的行不会被任何机制自动修复，会导致账号永久卡死
- `writing-mode: vertical-rl` **会改变** `text-align` **的语义**：横排时控制左右，竖排后实际控制另一个轴——想让竖排文字块整体贴左/居中/贴右，必须交给外层容器的flex `justifyContent`，竖排文字节点不能设`width:100%`
- **lucide 图标命名里 "xxxVertical" 和 "xxxHorizontal" 的语义**：`AlignStartVertical`等表示"对齐一条竖线基准"（实际控制左右位置）；`AlignStartHorizontal`等表示"对齐一条横线基准"（实际控制上下位置）——命名直觉容易理解反
- **CSS Grid** `repeat(n, 1fr)` **比 flex+justify-content/justify-between 更适合做"n个元素严格等宽分布"**：多行需要互相对齐时，让所有行共用同一套显式grid列定义，比逐行手工核对像素可靠
- **奇数/偶数等分点不能想当然嵌套**：把一段范围先按A份切、再往其中一份内部按B份切，两者的分割点大多数对不上，除非显式计算好精确百分比
- **Fontsource 包 = Google Fonts 官方目录的打包镜像，技术名不代表设计血统**：引入这类包时，界面上呈现给用户的名字要走独立的"技术名→显示名"映射表
- **对可能残缺的对象做兜底，要按字段各自兜底，不能只判断整个对象是否为 null/undefined**：`style ?? DEFAULT_STYLE` 再解构，如果`style`非NULL但内容残缺（比如`{}`），会跳过兜底照样崩溃。正确写法是逐字段兜底：`style?.card ?? DEFAULT_CARD`。**同一个字段的兜底逻辑如果在多个文件里各自重复实现，必须每一处都检查到位，不能默认"共享组件已经修过就全局安全了"**
- **文件内容与预期不符是这个项目反复出现的问题根源，不是逻辑错误**：多轮协作（不同chat/不同工具）交替施工时，反复出现过"文件名对、内容却是另一个文件的""收到的文件是更早以前的旧版本"这类情况，且不止一次导致排查方向完全走偏。任何一次报错排查，如果代码逻辑看着没问题，第一时间应该怀疑"这份文件是不是本来就不对"，重新拉取一次实际内容确认，不要在错误的文件上反复推理
- **React `useMemo`/`useEffect` 等的依赖数组，长度必须每次渲染保持一致**：依赖数组里如果用 `...array.map(...)` 展开一个长度可变的数组，一旦这个数组长度变化（比如用户展开/收起了几个条目），会触发"依赖数组大小变化"的报错。这类运算如果本身很轻，直接去掉useMemo每次重新计算即可，不需要保留这层优化
- **无限滚动/分页机制，"还有没有更多"不能只看"这次接口有没有返回内容"**：如果数据源本身没有天然的游标/顺序概念（比如每次都是重新独立选一批，不是按顺序发页），"返回了内容"不代表"有新内容"——完全可能连续几次返回的都是已经拿到过的重复数据。正确判断标准是"这次返回的里面，有没有哪怕一条是之前所有页里都没出现过的"，否则容易陷入"接口一直有返回、但去重后实际新增趋近于零"的死循环，请求会不停发出去
- **改了构建配置文件（如 fumadocs 的 source.config.ts）后，dev server 打印"重新编译/重启"不代表内部缓存真的清干净了**：踩过一次改完配置反复测试、报错纹丝不动的坑，最后发现是某层内部处理器缓存没跟着热重载失效。改构建层配置后如果行为跟预期不符，先整个杀掉进程、删掉`.next`（以及有的话`.source`等框架自己的构建缓存目录）再重新启动，比反复相信"热重载已经生效"更可靠

## 已完成模块（一句话+指向详情文档，细节不在本文件展开）

- [x] 全部基础架构（Monorepo/路由/多语言/设计系统/导航框架）
- [x] Supabase Auth + Onboarding流程，详见 `Mindo-认证与账户.md`
- [x] 八字引擎/AI报告页/PDF导出，详见 `Mindo-算法-八字.md`
- [x] 通用时间引擎独立模块（packages/core/src/time/）
- [x] 大五人格（120题/引擎/常模匹配/T分），详见 `Mindo-算法-大五.md`
- [x] 西洋星盘（SVG星盘图）
- [x] 付费系统（Lemon Squeezy）
- [x] 仪表盘6列网格（自定义拖拽/碰撞解决/布局持久化）
- [x] 卡片架构重构（modules/目录，卡片自治，profileId唯一prop）
- [x] 测算中心页面（原divination，已全局改名assessments）
- [x] 档案管理拖拽排序、资产管理页面、账户注销真删除，详见 `Mindo-认证与账户.md`
- [x] 片语模块（后端全套/前端全套/卡片集/留言/提醒/推荐算法/感想/合并个人主页），详见 `Mindo-片语.md`
- [x] 片语+若干其他模块（档案/仪表盘/八字卡片/大五/西洋星盘/私信/用户主页）改造为使用 TanStack Query，含跨组件共享缓存与乐观更新重写。支付/AI报告生成链路/账户认证与安全明确排除在外，未改造
- [x] 内容库（Codex）技术地基：fumadocs-core+fumadocs-mdx装框架、/codex路由、搜索/链接校验/sitemap/llms.txt配套功能、八字首批词条目录骨架（仅占位，未写正式内容），详见 `Mindo-内容库.md`

## 待完成（项目全局性的留在这里，具体模块内部的待办去对应模块文档看）

- [ ] `public.users`补一个指向`auth.users(id)`的外键，或者写一个对称的`handle_deleted_user`触发器
- [ ] Supabase OAuth回调URL更新（新Vercel域名）
- [ ] 紫微斗数模块
- [ ] MBTI模块
- [ ] 论坛、商城模块
- [ ] 私信模块进一步完善
- [ ] 中国版部署（阿里云）
- [ ] 时间选择"只填小时不填分钟导致小时也丢失"的bug——用户提到过但未实际排查修复
- [ ] TanStack Query改造范围：C组（支付/AI报告生成链路/账户认证与安全，共7个文件）明确排除在本轮改造之外，留待单独一次施工处理
- [ ] 全项目扫描时顺带发现的两个疑似孤儿文件，待用户确认是否删除：`app/api/dashboard/profile/page.tsx`（位置反常，疑似档案页旧版本误放）、`components/modules/bazi/ReadingCard.tsx`（全项目无引用，疑似废弃，内部仍调用支付接口）
- [ ] 片语：翻译功能尚未接入（方案已从Google Cloud Translation改为待定，因绑卡+自动扣费风险，见Mindo-片语.md），详细待办见该文档
- [ ] 大五：颜色系统需要正式写入 `Mindo-算法-大五.md`（已知存在于`bigfive-constants.ts`，尚未拿到文件内容确认细节）
- [ ] 内容库：首批词条（八字板块）正式内容撰写——本次只搭了技术地基，所有词条文件都是占位文字，详见 `Mindo-内容库.md`
- [ ] 内容库：代码块语法高亮（Shiki）目前整体关闭，因为和 remark-math 的公式渲染冲突排查未彻底解决，详见 `Mindo-内容库.md`
