import 'katex/dist/katex.min.css';
import { notFound } from 'next/navigation';
import { codexSourceLoader } from '@/lib/source';
import { CodexHome } from '@/components/codex/CodexHome';
import { CodexTopicShell } from '@/components/codex/CodexTopicShell';
import { CodexDirectoryList } from '@/components/codex/CodexDirectoryList';
import { CodexArticleBody } from '@/components/codex/CodexArticleBody';
import { Cite } from '@/components/codex/Citation';
import { LanguageSwitcher } from '@/components/os/LanguageSwitcher';
import { getCodexTopicForSlug, isCodexTopicHome, isCodexTopicDirectory } from '@/config/codex-topics';

export default async function CodexPage({
  params,
}: {
  params: Promise<{ locale: string; slug?: string[] }>;
}) {
  const { locale, slug } = await params;

  if (!slug || slug.length === 0) {
    return (
      <>
        <div style={{ maxWidth: 576, margin: '0 auto', padding: '24px 16px 0' }}>
          <LanguageSwitcher />
        </div>
        <CodexHome locale={locale} />
      </>
    );
  }

  const topic = getCodexTopicForSlug(slug);

  if (topic && isCodexTopicDirectory(topic, slug)) {
    return (
      <>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 0' }}>
          <LanguageSwitcher />
        </div>
        <CodexTopicShell topic={topic} locale={locale}>
          <CodexDirectoryList topic={topic} locale={locale} />
        </CodexTopicShell>
      </>
    );
  }

  const page = codexSourceLoader.getPage(slug, locale);
  if (!page) notFound();

  const Body = page.data.body;
  const articleProps = {
    title: page.data.title,
    toc: page.data.toc,
  };

  if (topic) {
    const isHome = isCodexTopicHome(topic, slug);
    return (
      <>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 0' }}>
          <LanguageSwitcher />
        </div>
        <CodexTopicShell topic={topic} locale={locale}>
          <CodexArticleBody {...articleProps} showToc={!isHome}>
            <Body components={{ Cite }} />
          </CodexArticleBody>
        </CodexTopicShell>
      </>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      <LanguageSwitcher />
      <CodexArticleBody {...articleProps}>
        <Body components={{ Cite }} />
      </CodexArticleBody>
    </div>
  );
}
