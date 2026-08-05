import { fields } from '@keystatic/core';
import { block, mark } from '@keystatic/core/content-components';
import { Quote } from 'lucide-react';

// 词条正文（MDX）里可插入的自定义组件。
// 对应 content/codex/**/*.mdx 里手写的 <Cite title="..." url="...">...</Cite> JSX 标签，
// 见 Mindo-内容库.md 词条外壳草稿第4节"双重编码"与已有词条示例（content/codex/china/bazi/zh.mdx）。
//
// 用 mark（行内文字标记），不用 wrapper（区块容器）：现有文档里所有 <Cite> 都是单行写法
// （标签、被引文字、闭合标签写在同一行，内部没有空行分段）。这种写法在MDX里会被解析成
// "行内文本节点"（mdxJsxTextElement），而 wrapper 类型的组件要求子节点必须是"区块内容"
// （像正文段落那样），两者对不上，编辑后保存会报"unexpected children"错误。
// mark 类型的组件本来就只允许包裹一小段行内文字，跟现有写法完全匹配。
export const Cite = mark({
  label: '引用角标',
  icon: <Quote size={14} />,
  tag: 'span',
  schema: {
    title: fields.text({ label: '来源标题' }),
    url: fields.url({ label: '来源链接' }),
  },
});

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

// 最简版本的图片/视频嵌入块：只有一个链接字段，无尺寸/位置选项，一律默认展示。
// 见本次施工说明书第四节。
export const Media = block({
  label: '图片/视频',
  description: '粘贴一个已上传到外部的图片或视频网址，默认宽度、居中展示',
  schema: {
    url: fields.url({ label: '媒体链接' }),
  },
  ContentView({ value }) {
    const url = value.url ?? '';
    if (!url) {
      return <p style={{ opacity: 0.5, margin: 0 }}>（尚未粘贴链接）</p>;
    }
    if (isVideoUrl(url)) {
      return (
        <video src={url} controls style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
      );
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }} />
    );
  },
});

export const codexContentComponents = { Cite, Media };
