import { redirect } from 'next/navigation';

export default function CodexAdminIndexPage() {
  redirect('/admin/codex/entries');
}
