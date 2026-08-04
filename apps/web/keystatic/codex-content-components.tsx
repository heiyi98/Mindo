import { fields } from '@keystatic/core';
import { wrapper, block } from '@keystatic/core/content-components';

// 词条正文（MDX）里可插入的自定义组件。
// 对应 content/codex/**/*.mdx 里手写的 <Cite title="..." url="...">...</Cite> JSX 标签，
// 见 Mindo-内容库.md 词条外壳草稿第4节"双重编码"与已有词条示例（content/codex/china/bazi/zh.mdx）。
export const Cite = wrapper({
  label: '引用角标',
  description: '点击展开来源信息的引用标注，包裹一段被引用的正文',
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
