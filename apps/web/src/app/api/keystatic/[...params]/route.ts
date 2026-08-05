import path from 'node:path';
import { makeRouteHandler } from '@keystatic/next/route-handler';
import keystaticConfig, { showAdminUI } from '../../../../../keystatic.config';

function notFoundHandler() {
  return new Response(null, { status: 404 });
}

// localBaseDirectory 收窄到 content/（默认是 process.cwd()，即整个 apps/web）。
// Keystatic 本地模式每次读取/保存都会把这个目录下的全部文件重新扫一遍、逐个算内容指纹，
// 指到 apps/web 根目录时连 src/、public/（上千个字体文件）都被扫了一遍，是之前后台操作卡顿的
// 根因。收窄之后扫描范围只剩 content/ 这一份（目前只有 codex/ 一个子目录）。
//
// 这里指到 content/ 而不是再往里收到 content/codex/：collection 的 path 需要保留
// `codex/` 这一段前缀，不能让"collection 相对 localBaseDirectory 的基准路径"变成空字符串，
// 否则后台侧边栏的目录树查找会找不到节点、显示"Empty collection"，见
// keystatic/codex-collections.ts 顶部注释里记录的这次踩坑。
export const { GET, POST } = showAdminUI
  ? makeRouteHandler({
      config: keystaticConfig,
      localBaseDirectory: path.join(process.cwd(), 'content'),
    })
  : { GET: notFoundHandler, POST: notFoundHandler };
