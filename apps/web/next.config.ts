import createNextIntlPlugin from 'next-intl/plugin';
import { createMDX } from 'fumadocs-mdx/next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const withMDX = createMDX();

const nextConfig = {
  transpilePackages: ['@react-pdf/renderer'],
};

export default withNextIntl(withMDX(nextConfig));