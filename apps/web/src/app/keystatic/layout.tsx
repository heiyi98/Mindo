import { notFound } from 'next/navigation';
import { showAdminUI } from '../../../keystatic.config';
import KeystaticApp from './keystatic';

// 本地开发内部工具，不应该在生产环境（Vercel等）可访问，见 keystatic.config.tsx 的 showAdminUI。
export default function KeystaticLayout() {
  if (!showAdminUI) {
    notFound();
  }
  return <KeystaticApp />;
}
