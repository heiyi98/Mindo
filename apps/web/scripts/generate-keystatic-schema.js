/**
 * 生成 keystatic/messages-shapes.generated.json —— 翻译词典各命名空间文件的字段结构快照。
 *
 * 背景：keystatic.config.tsx 会被一个 'use client' 组件直接 import（Keystatic 官方推荐用法，
 * 见 src/app/keystatic/keystatic.tsx），意味着整个 config 及其依赖都会被打进浏览器端 bundle。
 * 浏览器端不能用 node:fs，所以"扫描 messages/ 目录、读 JSON 样本推导字段结构"这件事
 * 不能写在 config 运行时里，必须挪到这个独立的构建前脚本，产出一份纯数据的 JSON，
 * keystatic/messages-collections.ts 只管读这份 JSON、把它翻译成 Keystatic 字段，不碰 fs。
 *
 * 运行时机：package.json 的 predev/prebuild 会自动跑这个脚本，正常开发流程不需要手动执行。
 * 什么时候需要手动跑一次：新增了一个全新的翻译命名空间文件（比如新模块的 index.json），
 * 想在没重启 dev server 的情况下让 Keystatic 后台立刻认出它。
 */
const fs = require('node:fs');
const path = require('node:path');

const WEB_ROOT = path.join(__dirname, '..');
const MESSAGES_DIR = path.join(WEB_ROOT, 'messages');

// 需要跟 apps/web/src/i18n/routing.ts 里的 routing.locales 手动保持一致。
// 这个脚本跑在纯 Node（无 TS 编译）环境下，无法直接 import 那份 .ts 文件，
// 语言列表极少变动，两边手动同步的成本可以接受。
const LOCALES = ['en', 'zh', 'zh-Hant', 'fr', 'es', 'ja', 'ko', 'it', 'de'];

function listJsonFilesRecursive(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  let out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out = out.concat(listJsonFilesRecursive(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.json')) {
      out.push(rel);
    }
  }
  return out;
}

function inferShape(sample) {
  if (typeof sample === 'string') {
    return { kind: 'string', long: sample.length > 60 || sample.includes('\n') };
  }
  if (typeof sample === 'number') return { kind: 'number' };
  if (typeof sample === 'boolean') return { kind: 'boolean' };
  if (Array.isArray(sample)) {
    return { kind: 'array', element: inferShape(sample.length > 0 ? sample[0] : '') };
  }
  if (sample && typeof sample === 'object') {
    const shapeFields = {};
    for (const [key, value] of Object.entries(sample)) {
      shapeFields[key] = inferShape(value);
    }
    return { kind: 'object', fields: shapeFields };
  }
  return { kind: 'string', long: false };
}

// 用哪个语言的文件内容推导字段结构：优先 zh/en（CLAUDE.md 保证这两个语言必须完整）。
function findReferenceSample(rel) {
  const preferredOrder = ['zh', 'en', ...LOCALES];
  for (const locale of preferredOrder) {
    const filePath = path.join(MESSAGES_DIR, locale, rel);
    if (!fs.existsSync(filePath)) continue;
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      // 该语言文件损坏，换下一个候选
    }
  }
  return {};
}

function main() {
  const namespaceFiles = new Set();
  for (const locale of LOCALES) {
    for (const rel of listJsonFilesRecursive(path.join(MESSAGES_DIR, locale))) {
      namespaceFiles.add(rel);
    }
  }

  const result = {};
  for (const rel of [...namespaceFiles].sort()) {
    result[rel] = inferShape(findReferenceSample(rel));
  }

  const outDir = path.join(WEB_ROOT, 'keystatic');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'messages-shapes.generated.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  console.log(
    `[keystatic] 已生成 ${Object.keys(result).length} 个翻译命名空间的字段结构 -> ${path.relative(WEB_ROOT, outPath)}`
  );
}

main();
