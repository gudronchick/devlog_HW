'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ViewToggle = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get('view') ?? 'board';

  const setView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('view', view);
    router.push(`${pathname}?${params.toString()}`);
  };

  const t = useTranslations('board.viewToggle');
  const activeStyle =
    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground';

  return (
    <div role="group" aria-label={t('groupLabel')} className="flex items-center rounded-md border overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        className={cn('rounded-none h-9', currentView === 'board' && activeStyle)}
        onClick={() => setView('board')}
        aria-label={t('boardTitle')}
        aria-pressed={currentView === 'board'}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('rounded-none h-9', currentView === 'list' && activeStyle)}
        onClick={() => setView('list')}
        aria-label={t('listTitle')}
        aria-pressed={currentView === 'list'}
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};
