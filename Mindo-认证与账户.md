# Mindo 认证与账户模块 — 完整文档

## 一、登录方式

- Google OAuth：`queryParams: { prompt: 'select_account' }`强制每次弹账号选择框，不静默复用浏览器已有登录状态
- Facebook OAuth：onboarding内嵌登录表单和独立`/auth/login`页面都要有，两处UI是分开维护的，容易漏同步
- 邮箱验证链接：`/api/auth/confirm`

## 二、语言优先级（OAuth回调 `/api/auth/callback/route.ts`）

```
登录那一刻界面正在用的语言（通过redirectTo的locale参数传递）
→ 浏览器 Accept-Language
→ 数据库 users.language_preference（历史遗留，几乎不会命中）
→ 英文兜底
```

解析出的语言会顺手写回 `users.language_preference`（如果原本是空的）。触发OAuth的按钮（`handleGoogleLogin`/`handleFacebookLogin`）必须在`redirectTo`里带上`&locale=${locale}`，不然这个优先级链条的第一环就拿不到值。

## 三、自愈机制（callback/route.ts + confirm/route.ts）

- 查`public.users`用`maybeSingle()`不用`single()`——`single()`查不到行时会把error静默丢在解构里不处理，等同于把"这行不存在"这件事吞掉
- 如果查不到，用admin客户端补一份最小版本（`{id, email}`，跟`handle_new_user()`触发器一致），防止后续写`profiles`时因为外键约束失败
- `confirm/route.ts`（邮箱登录）也补上了handle自动生成逻辑，之前只有`callback/route.ts`（Google登录）有这段，邮箱注册用户一直没有handle

`handle_new_user()`触发器本身的定义、挂载位置，见`Mindo-数据库.md`，本节只记应用层的自愈逻辑。

## 四、Onboarding "先体验后注册"流程的认证保护逻辑

- 正常流程：填生日→时间地点→性别（全程匿名，不需要登录）→ teaser预览 → 登录 → 提交
- Google/Facebook登录是**整页跳转**（离开网站去对方平台，再跳回来），这会让onboarding页面组件被销毁重建，之前"监听登录成功就自动提交"的机制会跟着页面一起消失，永远不会被触发
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

- 必须调用`adminClient.auth.admin.deleteUser(user.id)`真正删除Auth身份，只调`supabase.auth.signOut()`只是清本地会话，不会删除`auth.users`记录——这是这次修复前的实际bug，导致"注销"后账号还留在Authentication列表里
- 删除顺序：先清各业务表（RLS保证只能删自己的）→ 再删Auth身份（写在最后，即便这步失败，业务数据至少已经清空，不会出现"身份没了、数据却还残留"的反向不一致）
- 已知架构缺口（`public.users`没有指向`auth.users`的外键）见`Mindo-数据库.md`，直接影响这里"删除顺序"这条规则为什么要这么设计

## 七、前端架构

### 7.1 Onboarding

- `app/[locale]/onboarding/page.tsx`——主流程页面，`step`/`state`/`saving`/`introPlaying`等状态管理，`useLayoutEffect`做登录状态检测（见第四节），提交阶段`fetch`POST写入档案
- `components/onboarding/teaser/TeaserPage.tsx`——"先体验"阶段的预览页（十神文案+同日主名人展示），`useEffect`里并发拉取两个内容接口。物理上嵌在onboarding认证保护流程当中，改动时要跟`onboarding/page.tsx`一起考虑时序，不要单独改出问题
- `components/onboarding/steps/CityPicker.tsx`——城市搜索选择器，防抖`useState`+`useEffect`+`fetch`。**这个组件不是onboarding专属**，档案编辑弹窗、大五人格测试前的地区选择（见`Mindo-大五.md`）都复用了同一套交互模式，但各自独立实现，不是共用同一个组件实例

### 7.2 账户管理（`(os)`路由组下）

- `components/dashboard/ProfileEditModal.tsx`——新建/编辑档案的弹窗表单，各字段独立`useState`，保存时`fetch` POST（新建）或PATCH（编辑）
- `app/[locale]/dashboard/(os)/profile/profiles/page.tsx`——档案管理页，拖拽排序（`@dnd-kit`，本人档案锁顶不参与排序，见`CLAUDE.md`"档案管理页面"）
- `app/[locale]/dashboard/(os)/profile/assets/page.tsx`——资产管理页，列出所有`bazi_readings`记录（不过滤status，支持中断恢复入口），出生地完整显示不截断，含真太阳时展示
- `app/[locale]/dashboard/(os)/profile/account/page.tsx`——账户安全（换邮箱、改密码、第三方登录解绑/绑定），`loadUser`函数里既调`supabase.auth`又`fetch` `/api/account/has-password`
- `app/[locale]/dashboard/(os)/profile/page.tsx`——账户注销入口（见第六节）+ handle/display_name修改

## 八、待完成

- [ ] `public.users`补一个指向`auth.users(id)`的外键——见`Mindo-数据库.md`
- [ ] Supabase OAuth回调URL更新（新Vercel域名）
