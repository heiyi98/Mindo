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
| 支付系统（虚拟币/VIP/凭证/兑换码/后台管理面板） | `Mindo-支付系统.md` |

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
packages/db/       ← 数据库访问层：接口定义 + Supabase具体实现，见下方"数据库访问层"一节
packages/payments/ ← 支付业务逻辑（扣款/续VIP/核销凭证/兑换码），依赖packages/db的接口定义
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
/{locale}/dashboard/profile/assets/     → 资产管理（已购报告 + 待消费资产[虚拟币/VIP/兑换券]标签切换，见Mindo-支付系统.md）
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

## 数据库访问层（`packages/db`）

业务代码（route.ts等）不直接调用`supabase.from()`/`.rpc()`/`supabase.auth`，中间隔一层：

```
packages/db/src/
  {module}/
    interface.ts          ← 接口定义：类型 + XxxRepository interface，不含任何Supabase代码
    supabaseRepository.ts ← Supabase具体实现：createSupabaseXxxRepository(client) 工厂函数
  supabase/index.ts        ← 汇总导出所有 createSupabaseXxxRepository
  index.ts                 ← 汇总导出所有接口定义/类型

apps/web/src/lib/{module}/adminClient.ts   ← 每个模块一个，负责"接口→具体实现"的最后绑定：
                                              在这里创建真正的Supabase连接（session/service role），
                                              调用 createSupabaseXxxRepository() 组装成可用的repository对象，
                                              route.ts 只import这里导出的repository，不知道也不关心底下是Supabase
```

已拆出的模块：`payments`（支付/钱包/凭证/兑换码，含`/admin`后台）、`account`（档案管理/账户安全/onboarding）、`bazi`（八字报告生成/reading-recovery）、`bigfive`（大五测算/导入）、`mindCards`（片语，21个route文件）、`western`（西洋星盘）、`social`（用户资料/关注/私信/名人库/天干内容库）。

**跨模块共用的类型**（目前只有`DbError`）统一放在`packages/db/src/shared/types.ts`，各模块`interface.ts`从这里导入再`export type`一次转发出去——不要互相借用某个具体业务模块的`interface.ts`，那样会让人误以为被借用的那个模块是"基础模块"。

**新增一个数据操作的步骤**：
1. 去对应模块的 `packages/db/src/{module}/interface.ts` 加一个方法签名（入参/返回值，不写实现）
2. 去同目录 `supabaseRepository.ts` 写这个方法的Supabase实现
3. 业务代码里通过 `apps/web/src/lib/{module}/adminClient.ts` 导出的repository对象调用

**认证检查统一收口**：API路由不再各自写`const supabase = await createClient(); const {data:{user}} = await supabase.auth.getUser()`，统一调用 `lib/auth/requireAuth.ts` 里的 `requireApiUser()`，返回`{supabase, user}`——`supabase`是session client（尊重RLS），路由自己的业务查询继续拿它传给对应模块的repository工厂函数。**例外**（不受这次收敛管，仍然直接用Supabase）：`api/auth/callback`、`api/auth/confirm`（OAuth/邮箱验证的真实实现本身，不是重复样板）、`lib/supabase/middleware.ts`（session刷新基础设施）、以及`LoginForm.tsx`/`LanguageSwitcher.tsx`等标了`'use client'`的浏览器端组件（登录/登出/浏览器侧语言切换这类动作，本来就该用browser client直接调，不适合塞进服务端repository）。

**片语模块的特殊情况**：`lib/mindCards/{visibility,favorites,authors,folderCover,behaviorCandidates}.ts`这5个共享业务函数内部是多步强耦合查询（尤其`behaviorCandidates.ts`一个函数六次查询），拆分收益低，这次**没有**把它们内部的`.from()`调用也搬进接口层，继续直接持有`mindCardsAdminClient`——21个route文件自己的直接查询已经全部走`mindCardsRepository`了。

**以后中国版怎么接入阿里云**：不改`interface.ts`、不改route.ts业务代码。只在对应模块下新建一个`aliyunRepository.ts`（实现同一个XxxRepository接口），然后把`apps/web-cn`（或`apps/web`里判断环境的分支）里的`lib/{module}/adminClient.ts`换成调用这个新工厂函数即可。

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

- **向Claude Code提供的施工/规格文档中，任何要求原样写入实际文件的字面内容（SQL、代码、配置），必须用代码块或引号清晰围起，并标注"以下是要写入的原文"，与解释设计理由的说明性文字物理分开**——防止执行者把设计理由的叙述性文字误当成要抄进文件的实际内容
- PowerShell -replace命令会损坏UTF-8中文字符，含中文的文件必须发给Claude修改后输出
- Turbo远程缓存会掩盖TypeScript错误，新建Vercel项目时会暴露历史积累的错误
- Noto_Sans_SC/TC 不接受 subsets 参数，直接省略即可
- vercel.json的cron表达式Hobby账号只支持每天一次（`0 0 * * *`）
- Vercel webhook偶发失效时，删除重建项目是最彻底的解法
- @react-pdf/renderer中文换行：必须用hyphenationCallback把每个字符拆开，不能用useCallback（缓存问题），字体必须用.ttf格式，路径必须用window.location.origin拼完整URL
- **Supabase新建表后，PostgREST接口层的表结构缓存不会立刻感知到**：SQL Editor里执行CREATE TABLE成功，不代表马上就能通过`supabase.from(表名)`查到——接口层报"找不到这张表"（`PGRST205`）时，先去SQL Editor跑`NOTIFY pgrst, 'reload schema';`手动触发刷新，不要先怀疑刚写的代码逻辑
- **本项目里"表没开RLS"不等于"anon/authenticated角色就能读写"**：常见的"Supabase默认会给新表自动grant权限"这个印象在本项目实测不成立——没开RLS、也没手动执行GRANT的表，session client（anon key+用户cookie）查询会静默返回空结果（不报错，就是查不到行），只有service role client能不受限访问。所有支付/账本相关的表，后端一律用service role client读写，即使表面上只是个"只读查询"，不要假设session client能读到
- **RLS policy要按"这张表的写入本该只能通过后端逻辑发生"来设计，不能只看"数据敏不敏感"**：`bazi_readings`历史上有一条允许owner直接INSERT的policy，本身看似合理（"用户当然能建自己的报告记录"），但这张表的INSERT实际上必须先过扣款逻辑，客户端直接insert就等于绕过付费——凡是"表面上是用户自己的数据，但写入这个动作背后有业务规则（扣款/权限校验/状态机）要跑"的表，客户端角色应该只给SELECT，写入一律走后端service role，不能默认"owner能读能写"这个RLS思维定式
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
- **删除一个route.ts文件后，`.next/dev/types/validator.ts`可能还残留对它的引用，报出"找不到模块"的类型错误**：这是Next.js typed-routes功能的开发缓存产物，不是真代码错误，删`.next`重启即可，不要在这个文件本身上排查
- **`packages/payments`这类"业务函数接收一个client参数、内部直接`client.rpc()/client.from()`"的写法，是"接口+实现"两层拆分的半成品**：函数签名已经不绑死"连哪个Supabase实例"，但还绑死"是不是Supabase"。彻底拆完的标志是这个参数从`SupabaseClient`类型换成自定义的`XxxRepository`接口类型，内部改叫`repo.xxxRaw()`而不是`client.rpc()`——这次阶段二数据库访问层拆分就是把项目里所有这类半成品（payments如此，`lib/mindCards/*.ts`的部分函数也是这个模式）里，路由文件自己的直接查询这一层全部拆成了这个终态，5个片语共享业务函数因为内部多步查询耦合度高被保留为半成品，是权衡后的例外，不是遗漏
- **`.auth.getUser()`不能不分青红皂白地全项目批量替换**：这个方法在项目里有两种性质完全不同的调用——大多数API路由里是"判断谁登录了"的重复样板（该收口成`requireApiUser()`），但`api/auth/callback`/`api/auth/confirm`里是OAuth/邮箱验证流程本身在拿到session后确认用户身份（这是认证功能的实现细节），客户端组件（`LoginForm.tsx`等）里是浏览器侧的登录状态展示（用的是browser client，不是server client，机制上就不同）。批量替换前必须先分清"这是重复的检查样板"还是"这本来就是认证这个功能自己的一部分"

## 已完成模块（一句话+指向详情文档，细节不在本文件展开）

- [x] 全部基础架构（Monorepo/路由/多语言/设计系统/导航框架）
- [x] Supabase Auth + Onboarding流程，详见 `Mindo-认证与账户.md`
- [x] 八字引擎/AI报告页/PDF导出，详见 `Mindo-算法-八字.md`
- [x] 通用时间引擎独立模块（packages/core/src/time/）
- [x] 大五人格（120题/引擎/常模匹配/T分），详见 `Mindo-算法-大五.md`
- [x] 西洋星盘（SVG星盘图）
- [x] 付费系统（虚拟币/VIP/服务覆盖凭证/兑换码/`/admin`后台管理面板，取代原Lemon Squeezy买断制），详见 `Mindo-支付系统.md`
- [x] 仪表盘6列网格（自定义拖拽/碰撞解决/布局持久化）
- [x] 卡片架构重构（modules/目录，卡片自治，profileId唯一prop）
- [x] 测算中心页面（原divination，已全局改名assessments）
- [x] 档案管理拖拽排序、资产管理页面、账户注销真删除，详见 `Mindo-认证与账户.md`
- [x] 片语模块（后端全套/前端全套/卡片集/留言/提醒/推荐算法/感想/合并个人主页），详见 `Mindo-片语.md`
- [x] 片语+若干其他模块（档案/仪表盘/八字卡片/大五/西洋星盘/私信/用户主页）改造为使用 TanStack Query，含跨组件共享缓存与乐观更新重写。支付/AI报告生成链路/账户认证与安全明确排除在外，未改造
- [x] 内容库（Codex）技术地基：fumadocs-core+fumadocs-mdx装框架、/codex路由、搜索/链接校验/sitemap/llms.txt配套功能、八字首批词条目录骨架（仅占位，未写正式内容），详见 `Mindo-内容库.md`
- [x] 数据库访问层拆分（`packages/db`接口定义+Supabase实现两层，详见"数据库访问层"一节）：支付/账户/八字报告/大五/片语/西洋星盘/用户关系与私信全部改造完毕，业务代码不再直接调用`supabase.from()/.rpc()`；同时把66处分散的API路由登录态检查统一收口成`requireApiUser()`

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
- [ ] `packages/core/src/bazi/pro.ts` 里还在 `import { engine } from './engine'`，但`engine.ts`早就把导出改名成了`baziEngine`——这是阶段二施工全局type-check时顺带发现的一个已存在的类型错误，不属于这次数据库访问层拆分的范围，没有动，需要单独排查这个文件是什么时候、被谁引入的
- [ ] `app/api/users/route.ts` 和 `app/api/users/me/route.ts` 两个文件内容完全一样（都是PATCH更新display_name/handle），疑似重复文件，待确认哪个是废弃的、可以删除
- [ ] 阶段二数据库访问层拆分时，`[locale]/dashboard/assessments/bazi/reading/page.tsx` 和 `[locale]/page.tsx`（落地页）这两个服务端页面里的`supabase.auth.getUser()`没有跟着收口进`requireApiUser()`——它们各自有自定义的重定向逻辑（前者未登录跳`/auth/login`而不是`requireAuth()`默认的`/`；后者要在有session时额外判断有没有档案再决定跳仪表盘还是onboarding），强行统一会改变现有行为，故意留下没动
- [ ] 中国版数据库实现（阿里云）：`packages/db`里每个模块的`aliyunRepository.ts`还没写，等阿里云那边的连接信息定下来再实现，实现完只需要改`apps/web-cn`各模块的`lib/{module}/adminClient.ts`指向新工厂函数，不用碰接口定义和业务代码
- [ ] 邮件通知服务尚未接入，`notifyAdminAlert`（`supabase/functions/_shared/alerts.ts`）目前只打日志，管理员需要主动去`/admin/alerts`查看重试引擎的警报，详见 `Mindo-支付系统.md`
- [ ] 2026-08-10施工时发现生产域名`mindo-web.vercel.app`当前返回`DEPLOYMENT_NOT_FOUND`（无正常部署），八字重试引擎相关的cron/Edge Function虽已就位并验证过网络链路，但要等这个部署问题解决才能真正跑起来，且完整端到端流程（真实生成/骨架屏/告警/删除报告）当时未能实测，详见 `Mindo-支付系统.md`
- [ ] `apps/web-cn`是独立git仓库，本次八字重试引擎重构（Edge Function/route.ts/packages/db/BaziReadingView.tsx等）只改了`apps/web`这一侧，`apps/web-cn`如果需要保持同步，需要另外手动同步过去
