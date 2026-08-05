import { defineConfig } from 'fumadocs-mdx/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// 内容库（Codex）的全局构建配置。具体的 collection 定义（defineDocs）
// 放在 src/lib/source.ts 里，用 fumadocs-mdx/macro 的写法直接声明，
// 这里只负责 MDX 编译层的全局选项：在 fumadocs 默认插件基础上追加数学公式支持。
export default defineConfig({
  mdxOptions: {
    remarkPlugins: (v) => [...v, remarkMath],
    rehypePlugins: (v) => [...v, rehypeKatex],
    // remark-math 把公式转成 hast 时，节点上会带 "language-math" class，
    // fumadocs 默认的代码高亮（Shiki）不管 rehypePlugins 顺序，永远最先跑，
    // 一看到 "language-math" 就想按代码语言高亮，但 Shiki 没有 math 语法，直接报错崩溃。
    // 试过用 langAlias 把 math 指向 plaintext 绕过，但 Shiki 这层没有按预期生效；
    // 本次任务不需要代码块高亮，直接关掉代码高亮，避免和公式渲染打架。
    rehypeCodeOptions: false,
  },
});
