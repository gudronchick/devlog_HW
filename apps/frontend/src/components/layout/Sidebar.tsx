import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { LayoutList } from 'lucide-react';

export const Sidebar = async () => {
  const t = await getTranslations('layout.sidebar');

  return (
    <aside className="w-52 shrink-0 border-r flex flex-col bg-background">
      <nav className="flex-1 p-3 space-y-1 pt-4" aria-label={t('navLabel')}>
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LayoutList className="h-4 w-4" aria-hidden="true" />
          {t('nav.tasks')}
        </Link>
      </nav>
    </aside>
  );
}
