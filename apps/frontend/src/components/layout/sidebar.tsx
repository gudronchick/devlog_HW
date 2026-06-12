import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { LayoutList } from 'lucide-react';

export async function Sidebar() {
  const t = await getTranslations('layout.sidebar.nav');

  return (
    <aside className="w-52 shrink-0 border-r flex flex-col bg-background">
      <nav className="flex-1 p-3 space-y-1 pt-4">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LayoutList className="h-4 w-4" />
          {t('tasks')}
        </Link>
      </nav>
    </aside>
  );
}
