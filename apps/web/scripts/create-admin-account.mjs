// 创建一个后台管理员账号（public.admin），不是普通用户注册流程。
//
// 用法：
//   node --env-file=.env.local scripts/create-admin-account.mjs <邮箱> <密码> [显示名称]
//
// 做了三件事：
//   1. supabase.auth.admin.createUser() —— 在Supabase Auth里创建一个真实账号
//      （密码存储/校验完全交给Supabase自己处理，这里不碰任何加密逻辑）。
//      这一步会顺带触发 handle_new_user() 触发器，自动往 public.users 插一行
//      影子记录——这是全站每次真实用户注册都会发生的正常行为，管理员账号
//      不需要它，第2步删掉。
//   2. 删除刚才被触发器自动创建的那条 public.users 行——不是直接改
//      handle_new_user() 本身（那是全站共用的触发器，没必要为了这一个
//      新用途去改它、承担改错影响全站注册的风险）。
//   3. 写入 public.admin，这才是这个账号真正的后台身份记录。
//
// 中途任何一步失败，会尝试把已经创建的Auth账号删掉，不留下"有登录身份、
// 但既不是普通用户也不是管理员"的孤儿账号。
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wsbskrgrkajnzzgpcfws.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const [, , email, password, displayName] = process.argv;

if (!SERVICE_ROLE_KEY) {
  console.error('缺少 SUPABASE_SERVICE_ROLE_KEY 环境变量，运行时加 --env-file=.env.local');
  process.exit(1);
}
if (!email || !password) {
  console.error('用法：node --env-file=.env.local scripts/create-admin-account.mjs <邮箱> <密码> [显示名称]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('密码至少8位');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (createError || !created?.user) {
  console.error('创建Auth账号失败：', createError?.message ?? '未知错误');
  process.exit(1);
}

const userId = created.user.id;
console.log(`Auth账号已创建，id=${userId}`);

// handle_new_user() 触发器已经自动插了一行 public.users，管理员账号不需要，删掉。
const { error: deleteUsersRowError } = await supabase.from('users').delete().eq('id', userId);
if (deleteUsersRowError) {
  console.error('清理 public.users 影子记录失败：', deleteUsersRowError.message);
  await supabase.auth.admin.deleteUser(userId);
  console.error('已回滚：删除刚创建的Auth账号');
  process.exit(1);
}

const { error: insertAdminError } = await supabase
  .from('admin')
  .insert({ id: userId, email, display_name: displayName ?? null });

if (insertAdminError) {
  console.error('写入 public.admin 失败：', insertAdminError.message);
  await supabase.auth.admin.deleteUser(userId);
  console.error('已回滚：删除刚创建的Auth账号');
  process.exit(1);
}

console.log(`管理员账号创建成功：${email}`);
console.log('默认是超级管理员（不限分类），如需限制到specific分类，去 codex_admin_scopes 表加记录。');
