# Mindo 认证与账户模块 — 完整文档

## 一、总体结构：Mindo 只验证 Alethego 的令牌（2026-10 改造）

```
【Alethego 身份项目】 https://ibtwrccctdsqdygjebsp.supabase.co
  只负责：注册、登录（邮箱密码、Google）、签发 access token、续期
        │ access token（sub = 用户编号，带 email，ES256 签名）
        ├───────────────────────┐
        ▼                       ▼
   TaskApp 的数据             Mindo 的数据
 （Mindo项目 taskapp schema）（Mindo项目 public schema）
```

- 账号互通、内容不互通：同一个 Alethego 账号能登录 TaskApp 和 Mindo，两边业务数据完全分开，各有各的用户资料表。
- Mindo **不签发、不换发**任何令牌，不持有签名密钥。Mindo 项目对 Alethego 的 Third-Party Auth 信任登记是 TaskApp 也在用的，**绝对不要动**。
- `auth.uid()` = Alethego 用户编号；`auth.jwt() ->> 'email'` = 邮箱。这些用户在 Mindo 的 `auth.users` 里**没有记录**，所以任何业务表外键都只能指向 `public.users`，不能指向 `auth.users`。
- 不要往 Alethego 里加任何 Mindo 专属字段/表。
- 例外：后台管理员（`public.admin`）仍然是 Mindo 项目自己 Supabase Auth 里的真实账号，登录入口 `/admin/login`，跟这套完全独立。

## 二、代码里的几个 client（`lib/supabase/`）

| 位置 | 函数 | 连哪里 | 用途 |
|---|---|---|---|
| 浏览器 `client.ts` | `createLoginClient()` | Alethego | 登录/注册/改密码/退出/读"当前是谁"。会话存 cookie（`@supabase/ssr`），PKCE |
| 浏览器 `client.ts` | `createClient()` | Mindo | 只读写业务数据，`accessToken` 选项每次带上登录client当前的令牌。**它的 `.auth.*` 不能用**（会报错），查当前用户一律用 `createLoginClient().auth` |
| 浏览器 `client.ts` | `createStaffClient()` | Mindo 自己的 Auth | 只给 `/admin/login` 用 |
| 服务器 `server.ts` | `getVerifiedSession()` | Alethego + Mindo | 从 cookie 取 Alethego 令牌 → `getClaims()` 用 Alethego 公钥本地验签 → 返回 `{ supabase: 带令牌的Mindo数据client, user }`。`requireApiUser()`/`requireAuth()`/`requireProfile()` 和服务端页面都走它 |
| 服务器 `server.ts` | `createLoginServerClient()` | Alethego | 兑换授权码、服务器端退出 |
| 服务器 `server.ts` | `createClient()` | Mindo | 带当前令牌（没有就匿名）的数据client，只查数据，不用来认人 |
| 服务器 `server.ts` | `createStaffServerClient()` | Mindo 自己的 Auth | 只给 `requireStaffAccount()` 用 |
| `middleware.ts` | `updateSession(req, 'user' \| 'staff')` | — | `proxy.ts` 每个请求续期 cookie：`/admin`、`/api/admin` 续管理员会话，其余续 Alethego 会话 |

- 退出登录一律 `signOut({ scope: 'local' })`：只清本浏览器的 Mindo 会话，不吊销这个账号在 TaskApp 那边的登录。

## 三、登录方式与"登录后建档"（ensure_current_user）

- 只有 **邮箱密码** 和 **Google** 两种（Alethego 只提供这两种）。Facebook、邮箱验证码（magic link）、换邮箱、绑定/解绑第三方、注册后设密码页（`/auth/set-password`）都已删除。
- Google 登录：`queryParams: { prompt: 'select_account' }` 强制弹账号选择框；`redirectTo` 带 `&locale=${locale}`。
- 所有"带授权码跳回来"的入口（Google、注册确认邮件、忘记密码邮件）都汇到 `/api/auth/callback`：服务器端兑换会话 → `ensure_current_user` → `next` 在白名单里（目前只有 `/auth/reset-password`）就去 `next`，否则按"有没有档案"去仪表盘或 onboarding。`/api/auth/confirm` 只是 token_hash 形式邮件链接的备用入口。
- **`public.ensure_current_user(p_email, p_display_name, p_language)`**：登录后、读写任何业务数据之前调用一次（前端封装在 `lib/auth/ensureCurrentUser.ts`）。第一次建 `public.users` 行（自动生成 `mindo_xxxxxx` handle、写入当时界面语言），之后每次只同步 email；`display_name` 建好后只由用户在 Mindo 里改，不被 Alethego 覆盖。默认名字：`full_name` / `name` / `display_name` → 邮箱 @ 前面那段。以调用者身份执行（不是 security definer），受 RLS 约束。调用点：
  - 邮箱密码登录/注册成功（`LoginForm.tsx`、onboarding 内嵌登录表单）——先 ensure 再提交档案，顺序不能反（`profiles.user_id` 外键指向 `public.users`）
  - `/api/auth/callback`、`/api/auth/confirm`
- 语言优先级（callback）：登录那一刻界面语言（`locale` 参数）→ 浏览器 Accept-Language → `users.language_preference` → 英文。
- 以前 `handle_new_user()` 触发器 + callback/confirm 里"用 admin client 补一行"的自愈逻辑已全部被 `ensure_current_user` 取代（触发器已删）。
- 改密码（账户安全页）/ 忘记密码（`/auth/reset-password`）改的是 **Alethego 账号**的密码，TaskApp 同时生效，页面上有提示。
- **Alethego** 项目 Authentication → URL Configuration 的 Redirect URLs 里已加上 `https://mindo-gold.vercel.app/**` 和 `http://localhost:3000/**`（2026-10-08 用户手动配置）。**必须用 `/**` 通配写法**：Mindo 的回调地址带查询参数（`?locale=..&next=..`），只写 `/api/auth/callback` 时 Alethego 匹配不上，会退回它的 Site URL（localhost，TaskApp 在用，不能改），表现为"Google 登录后跳到 localhost 拒绝连接"。以后换生产域名必须同步改这里。
- 改造上线后，老用户浏览器里如果还开着/缓存着改造前的页面，点 Google 登录会走旧代码（Mindo 自己的 Auth）同样跳到 localhost——强制刷新（Ctrl+Shift+R）或清站点数据即可，不是代码问题（2026-10-08 实测）。

## 四、Onboarding "先体验后注册"流程的认证保护逻辑

- 正常流程：填生日→时间地点→性别（全程匿名，不需要登录）→ teaser预览 → 登录 → 提交
- Google登录是**整页跳转**（离开网站去对方平台，再跳回来），这会让onboarding页面组件被销毁重建，之前"监听登录成功就自动提交"的机制会跟着页面一起消失，永远不会被触发
- **修复方案**：页面挂载时检测`sessionStorage`（`SESSION_KEY`，tab-scoped）里有没有已填写的表单数据
  - 有数据+已登录 → 判定为"OAuth跳转返回，同一个标签页"，直接用恢复出来的数据自动完成提交
  - 无数据+已登录 → 判定为"共用设备场景，不同的人碰到了残留登录状态"（sessionStorage不跨标签页共享，能利用这一点区分），主动登出，保证不会有人在不知情的情况下把资料填进别人账号
  - 这个判断逻辑取代了之前一版"只要挂载时发现已登录就无条件登出"的方案——那版会误伤"刚合法OAuth跳转回来"的正常情况，已废弃，不要恢复
- 检测逻辑用`useLayoutEffect`（不是`useEffect`），避免"先渲染错误的中间态、再切换"这种闪烁（这个useEffect/useLayoutEffect的选择原则是通用的，已记入`CLAUDE.md`"关键教训"）

## 五、已讨论但明确否决/搁置的方案（不要重新实现）

- **"退出到首页"按钮**：曾经加过又主动撤掉了——onboarding里放退出入口被认为是负面体验，不需要
- **pagehide/beforeunload清登录状态**：讨论过用页面卸载事件清本地凭证，实现复杂（至少要排除"OAuth跳转中""提交成功跳转中"两类误伤场景），用户评估后放弃这个方向，选择接受现有的sessionStorage方案
- **邮箱注册handle自动生成的命名统一**（`hourPlaceholder` vs `unknownMinute`两个键命名风格不一致）：用户决定不改

## 六、账户注销（`/api/account/delete/route.ts`）

- 注销 = **只清空这个人在 Mindo 的数据** + 退出本浏览器会话。账号本身在 Alethego（TaskApp 也在用），Mindo 不删、也没有权限删；之后再用同一账号登录 Mindo 会被当作全新用户（`ensure_current_user` 重新建行）。
- 顺序：先 `deleteAllUserData`（session client，RLS 只能删自己的）→ 再 `deleteMindoUser`（service role 删 `public.users` 这一行，指向它的外键 CASCADE 清空剩余下游表）→ `signOut({ scope: 'local' })`。
- 已知限制：如果某张表指向 `public.users` 的外键不是 CASCADE（比如 `pro_transactions.user_id`），删 `public.users` 会失败，接口返回 500。改造前通过删 auth.users 级联也是同样结果，不是这次引入的。

## 七、前端架构

### 7.1 Onboarding

- `app/[locale]/onboarding/page.tsx`——主流程页面，`step`/`state`/`saving`/`introPlaying`等状态管理，`useLayoutEffect`做登录状态检测（见第四节），提交阶段`fetch`POST写入档案
- `components/onboarding/teaser/TeaserPage.tsx`——"先体验"阶段的预览页（十神文案+同日主名人展示），`useEffect`里并发拉取两个内容接口。物理上嵌在onboarding认证保护流程当中，改动时要跟`onboarding/page.tsx`一起考虑时序，不要单独改出问题
- `components/onboarding/steps/CityPicker.tsx`——城市搜索选择器，防抖`useState`+`useEffect`+`fetch`。**这个组件不是onboarding专属**，档案编辑弹窗、大五人格测试前的地区选择（见`Mindo-大五.md`）都复用了同一套交互模式，但各自独立实现，不是共用同一个组件实例

### 7.2 账户管理（`(os)`路由组下）

- `components/dashboard/ProfileEditModal.tsx`——新建/编辑档案的弹窗表单，各字段独立`useState`，保存时`fetch` POST（新建）或PATCH（编辑）
- `app/[locale]/dashboard/(os)/profile/profiles/page.tsx`——档案管理页，拖拽排序（`@dnd-kit`，本人档案锁顶不参与排序，见`CLAUDE.md`"档案管理页面"）
- `app/[locale]/dashboard/(os)/profile/assets/page.tsx`——资产管理页，列出所有`bazi_readings`记录（不过滤status，支持中断恢复入口），出生地完整显示不截断，含真太阳时展示
- `app/[locale]/dashboard/(os)/profile/account/page.tsx`——账户安全：只读显示邮箱 + 修改/设置密码（Alethego 账号密码），"有没有密码"按 `user.identities` 里有没有 `provider='email'` 判断（`/api/account/has-password` 已删除）
- `app/[locale]/dashboard/(os)/profile/page.tsx`——账户注销入口（见第六节）+ handle/display_name修改

## 八、待完成

- [ ] `apps/web-cn`（独立仓库）未同步这次改造
