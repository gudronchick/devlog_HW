'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { ArrowDownAZ, ArrowUpAZ, Plus, Sparkles } from 'lucide-react';
import { ViewToggle } from '@/components/tasks/ViewToggle';
import { AnalyseDayModal } from '@/components/tasks/AnalyseDayModal';
import Link from 'next/link';

export const TopBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('board.toolbar');

  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');
  const [analyseOpen, setAnalyseOpen] = useState(false);

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      updateParam('search', searchValue.trim() || null);
    });
    return () => clearTimeout(timeout);
  }, [searchValue, updateParam]);

  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const order = searchParams.get('order') ?? 'desc';

  return (
    <>
      <div role="toolbar" aria-label={t('toolbarLabel')} className="flex items-center gap-2 px-6 py-3 border-b bg-background flex-wrap">
        <Input
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-56"
        />

        <Select value={sortBy} onValueChange={(v) => updateParam('sortBy', v)}>
          <SelectTrigger className="w-40" aria-label={t('sortLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t('sortCreatedAt')}</SelectItem>
            <SelectItem value="updatedAt">{t('sortUpdatedAt')}</SelectItem>
            <SelectItem value="priority">{t('sortPriority')}</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => updateParam('order', order === 'asc' ? 'desc' : 'asc')}
          aria-label={order === 'asc' ? t('orderAscending') : t('orderDescending')}
        >
          {order === 'asc' ? (
            <ArrowUpAZ className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>

        <ViewToggle />

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setAnalyseOpen(true)}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {t('analyseDay')}
          </Button>
          <Link href="/tasks/new">
            <Button>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t('newTask')}
            </Button>
          </Link>
        </div>
      </div>

      <AnalyseDayModal open={analyseOpen} onOpenChange={setAnalyseOpen} />
    </>
  );
};
