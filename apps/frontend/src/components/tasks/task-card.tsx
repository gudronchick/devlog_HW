'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Layers, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { deleteTask } from '@/lib/api';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const STATUS_BORDER: Record<TaskStatus, string> = {
  todo: 'border-l-slate-300 dark:border-l-slate-600',
  'in-progress': 'border-l-blue-400 dark:border-l-blue-500',
  done: 'border-l-emerald-400 dark:border-l-emerald-500',
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  'in-progress': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  done: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export interface TaskCardTranslations {
  deleteAriaLabel: string;
  statusLabels: Record<TaskStatus, string>;
  priorityLabels: Record<TaskPriority, string>;
}

interface TaskCardProps {
  task: Task;
  t: TaskCardTranslations;
  className?: string;
}

export function TaskCard({ task, t, className }: TaskCardProps) {
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await deleteTask(task.id);
    router.refresh();
  }

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card
        className={cn(
          'hover:shadow-md transition-all cursor-pointer group border-l-4 overflow-hidden',
          STATUS_BORDER[task.status],
          className
        )}
      >
        <CardContent className="p-4 space-y-2.5">
          <div className="flex items-start gap-2">
            <p className="text-sm font-medium leading-snug line-clamp-2 flex-1 mt-0.5">
              {task.title}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
              onClick={handleDelete}
              aria-label={t.deleteAriaLabel}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={cn('text-xs capitalize', PRIORITY_CLASS[task.priority])}>
                {t.priorityLabels[task.priority]}
              </Badge>
              <Badge className={cn('text-xs', STATUS_BADGE[task.status])}>
                {t.statusLabels[task.status]}
              </Badge>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              {task.subtasks.length > 0 && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {task.subtasks.length}
                </span>
              )}
              <span>{relativeTime(task.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
