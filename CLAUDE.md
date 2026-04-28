@AGENTS.md

# Mindo — 项目记忆文件

## 项目简介
全球化赛博玄学Web App，集命理测算、心理测量、社区论坛、社交匹配、周边商城于一体。

- 生产环境URL：https://mindo-web.vercel.app
- GitHub仓库：https://github.com/heiyi98/Mindo

## 当前技术栈
- Monorepo工具：pnpm workspace + Turborepo
- 前端：Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion
- 国际化：next-intl 4.x
- 数据库：Supabase（PostgreSQL + RLS）
- 图标：lucide-react
- 部署：Vercel（国际版）/ 阿里云（中国版，待定）

## Monorepo结构
apps/web/          ← Next.js前端主应用
packages/core/     ← 命理+心理计算引擎（纯逻辑，无UI依赖）
packages/db/       ← 数据库schema和Supabase客户端
packages/ui/       ← 共享UI组件库
packages/config/   ← 共享TypeScript/ESLint配置

## 多语言规则（铁律，不得违反）
1. 任何组件里禁止出现硬编码的中文或英文用户可见字符串
2. 所有文字必须通过 useTranslations() 或 getTranslations() 读取
3. 翻译文件位置：apps/web/messages/{locale}.json
4. 当前支持语言：en（默认）、zh、fr、es、ja、ko、vi
5. 新增功能时必须同步更新 en.json 和 zh.json，其他语言留空占位

## 路由结构
/                  → 自动重定向到用户浏览器语言
/{locale}/         → 首页
/{locale}/divination/ → 测算模块
/{locale}/forum/   → 论坛模块
/{locale}/shop/    → 商城模块
/{locale}/messages/ → 私信模块
/{locale}/profile/ → 个人中心

## 架构铁律
1. 模块完全解耦：任何单一模块的修改不得影响其他模块
2. AI调用必须走后端API路由，禁止在前端暴露任何Prompt
3. 所有颜色和间距必须引用设计系统变量，禁止硬编码
4. 计算结果必须存为快照，禁止重复触发计算
5. packages/core 禁止引入任何前端框架依赖

## 已完成模块
- [x] Monorepo基础结构
- [x] next-intl多语言框架（en/zh验证通过）
- [x] 路由中间件（自动语言重定向）
- [x] 设计系统（暗色模式，Apple配色，毛玻璃变量）
- [x] 双轴导航框架（左侧48px Dock + 顶部48px状态栏 + 主内容区）
- [x] 顶部状态栏Context系统（各页面可独立注入内容）
- [x] 数据库Schema（5张表：users/profiles/snapshots/subscriptions/purchases，已部署到Supabase）
- [x] Supabase项目连接（环境变量已配置）
- [x] packages/core 算法引擎归档完成
  - engine.ts（八字排盘 + 真太阳时）
  - energy-engine.ts（五行能量计算）
  - destiny-timeline.ts（大运流年时间轴）
  - relations.ts（刑冲合害关系引擎）
  - pro-engine.ts（专业模式入口）
- [x] 身份认证（Magic Link邮件登录 + Google OAuth，Supabase Auth）
- [x] 认证回调路由（/api/auth/confirm 处理OTP，/api/auth/callback 处理OAuth）
- [x] Onboarding流程（DatePicker/TimePicker/CityPicker/GenderPicker四步骤）
- [x] Onboarding状态管理（sessionStorage，登录后写入数据库）
- [x] 城市搜索API（OpenStreetMap Nominatim）
- [x] onboarding/complete API路由（写入profiles表）
- [x] 落地页（Logo + Slogan + Begin按钮 + 语言切换）
- [x] 路由重构（OS主框架移至/dashboard，落地页分离）
- [x] 登录后自动跳转逻辑（有档案→dashboard，无档案→onboarding）
- [x] stem_content表（十天干软内容，支持多语言、多内容类型、jsonb灵活存储）
- [x] celebrities表（名人数据，按stem_id分类，支持排序和启用控制）
- [x] 引导页Teaser（日主卡片、五行五维图、名人轮播、登录按钮）
- [x] 八字计算API路由（/api/bazi/calculate）
- [x] 软内容查询API路由（/api/stem-content）
- [x] 名人查询API路由（/api/celebrities）
- [x] 仪表盘主页（八字命盘、五行五维图、今日运势占位）
- [x] 仪表盘数据API（/api/dashboard，含快照缓存机制）
- [x] 根layout修复（html/body标签，dark class，globals.css）
- [x] 主题切换系统（浅色/深色/跟随系统，localStorage持久化，防闪烁）
- [x] ThemeToggle组件（顶部状态栏默认显示，各模块可覆盖）
- [x] 登录保护（未登录访问dashboard自动跳转落地页）
- [x] requireAuth / requireProfile 工具函数（src/lib/auth/requireAuth.ts）
- [x] 档案切换（顶部状态栏左侧，切换后仪表盘数据更新）
- [x] 账户管理页面（邮箱显示、退出登录、注销账户）
- [x] 档案管理页面（列表、新增、编辑、删除）
- [x] 档案编辑弹窗（名称、生日、时间、城市、性别）
- [x] 资产管理页面（付费快照存档）
- [x] 大五人格测量模块（算法引擎、120题答题流程、结果雷达图和得分卡）
- [x] 大五人格API（/api/psychology/bigfive，含快照缓存）
- [x] 测算模块注册表（src/config/assessments.ts，单一数据源）
- [x] 测算状态查询API（/api/assessments/status）
- [x] 测算中心页面（/dashboard/divination，按命理/心理分组）
- [x] CurrentProfile Context（OS层共享档案状态）
- [x] 语言切换组件（含数据库偏好持久化）
- [x] 大五人格缓存读取（进入页面检查历史结果，支持重新测量）
- [x] 多语言系统改进（登录后自动应用语言偏好，落地页下拉菜单，账户页语言设置）
- [x] 支持9种语言（en/zh/fr/es/ja/ko/vi/it/de）
- [x] 西洋星盘模块（astronomy-engine MIT协议，日期/时分双模式，Placidus宫位+高纬度自动降级Whole Sign，月亮薛定谔机制）
- [x] 西洋星盘前端（圆形星盘图SVG、行星列表、宫位列表）
- [x] 量表类切换档案自动进入答题流程
- [x] 部署到Vercel（https://mindo-web.vercel.app）
- [x] Supabase Auth配置（Google OAuth + Magic Link）

## 架构决策记录（已锁定，不得随意更改）

1. 主键：UUID v7格式
2. 导航状态栏：React Context实现，不用Parallel Routes
3. 数据库客户端：统一在packages/db管理，便于多端共用
4. 认证：Supabase Auth（邮箱+Google，未来加微信）
5. 文件存储：Cloudflare R2（用户头像/论坛图片/商品图）
6. 论坛/私信内容：存PostgreSQL，实时推送用Supabase Realtime
7. 用户档案：免费限1个，VIP无限，业务层控制
8. 快照：按测算类型独立存储，snapshot_type不枚举
9. 支付渠道：provider字段不枚举，国际版/中国版各自管理
10. 双区完全隔离：账号/VIP/内容三层全部独立，不跨区同步
11. 软内容管理：十天干人格内容、名人数据存数据库，按locale区分语言，现阶段直接在Supabase Table Editor编辑，后台管理系统待开发

## 待完成模块
- [ ] 主题系统（浅色/深色/跟随系统，苹果配色规范，与用户设置模块一起实现）
- [ ] 测算引擎
- [ ] 各功能模块
