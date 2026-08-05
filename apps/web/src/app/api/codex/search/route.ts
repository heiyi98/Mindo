import { createFromSource } from 'fumadocs-core/search/server';
import { codexSourceLoader } from '@/lib/source';
import { getCodexTopicForSlug } from '@/config/codex-topics';

// 自定义 buildIndex：给每个页面按 slug 所属主题打 tag，
// 供主题范围内的搜索框（CodexSearchBox tag=...）把搜索结果限定在本主题内。
const server = createFromSource(codexSourceLoader, {
  buildIndex: (page) => {
    const topic = getCodexTopicForSlug(page.slugs);

    return {
      id: page.url,
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      structuredData: page.data.structuredData,
      tag: topic?.searchTag,
    };
  },
});

export const { GET } = server;
