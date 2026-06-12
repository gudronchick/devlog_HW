'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
  }

  return (
    <div className="flex items-center rounded-md border overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        className={cn('rounded-none h-9', currentView === 'board' && 'bg-accent')}
        onClick={() => setView('board')}
        title="Board view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn('rounded-none h-9', currentView === 'list' && 'bg-accent')}
        onClick={() => setView('list')}
        title="List view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
