'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDownAZ, ArrowUpAZ, Plus, Sparkles } from 'lucide-react';
import { ViewToggle } from '@/components/tasks/view-toggle';
import Link from 'next/link';

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get('search') ?? '');

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
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchValue, updateParam]);

  const sortBy = searchParams.get('sortBy') ?? 'createdAt';
  const order = searchParams.get('order') ?? 'desc';

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b bg-background flex-wrap">
      <Input
        placeholder="Search tasks…"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="w-56"
      />

      <Select value={sortBy} onValueChange={(v) => updateParam('sortBy', v)}>
        <SelectTrigger className="w-38">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">Date created</SelectItem>
          <SelectItem value="updatedAt">Date updated</SelectItem>
          <SelectItem value="priority">Priority</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={() => updateParam('order', order === 'asc' ? 'desc' : 'asc')}
        title={order === 'asc' ? 'Ascending' : 'Descending'}
      >
        {order === 'asc' ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
      </Button>

      <ViewToggle />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" disabled className="text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Analyse my day
        </Button>
        <Link href="/tasks/new">
          <Button>
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </Link>
      </div>
    </div>
  );
}
