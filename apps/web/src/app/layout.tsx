import { getLocale } from 'next-intl/server';
import { Noto_Sans_SC, Noto_Sans_TC, Noto_Sans } from 'next/font/google';
import './globals.css';

const notoSansSC = Noto_Sans_SC({
  weight: ['300', '400', '500'],
  subsets: ['chinese-simplified'],
  display: 'swap',
});

const notoSansTC = Noto_Sans_TC({
  weight: ['300', '400', '500'],
  subsets: ['chinese-traditional'],
  display: 'swap',
});

const notoSans = Noto_Sans({
  weight: ['300', '400', '500'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

function getFontClassName(locale: string): string {
  if (locale === 'zh') return notoSansSC.className;
  if (locale === 'zh-Hant') return notoSansTC.className;
  return notoSans.className;
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const fontClass = getFontClassName(locale);

  return (
    <html lang={locale} className={`dark ${fontClass}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('mindo-theme');
                  var root = document.documentElement;
                  if (theme === 'light') {
                    root.classList.remove('dark');
                  } else if (theme === 'system') {
                    if (!window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      root.classList.remove('dark');
                    }
                  }
                } catch(e) {}
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}