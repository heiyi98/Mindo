import { TopBarProvider } from '@/components/os/TopBarContext';
import { TopBar } from '@/components/os/TopBar';
import { Dock } from '@/components/os/Dock';
import { requireProfile } from '@/lib/auth/requireAuth';
import { CurrentProfileProvider } from '@/components/os/CurrentProfileContext';

export default async function OSLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireProfile(locale);

  return (
    <CurrentProfileProvider>
      <TopBarProvider>
        <Dock />
        <TopBar />
        <main
          style={{
            marginLeft: 48,
            marginTop: 48,
            minHeight: 'calc(100vh - 48px)',
            padding: 24,
          }}
        >
          {children}
        </main>
      </TopBarProvider>
    </CurrentProfileProvider>
  );
}
