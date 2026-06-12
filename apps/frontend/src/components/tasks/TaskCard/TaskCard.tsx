'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Layers, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { deleteTaskAction } from '@/lib/actions';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PRIORITY_CLASS, PRIORITY_KEY, STATUS_BADGE, STATUS_BORDER, STATUS_KEY } from './constants';
import { getRelativeTime } from '@/utils';

interface TaskCardProps {
  task: Task;
  className?: string;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, className }) => {
  const t = useTranslations('board.card');

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteTaskAction(task.id);
  };

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
              aria-label={t('deleteAriaLabel')}
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
                {t(PRIORITY_KEY[task.priority])}
              </Badge>
              <Badge className={cn('text-xs', STATUS_BADGE[task.status])}>
                {t(STATUS_KEY[task.status])}
              </Badge>
            </div>

            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
              {task.subtasks.length > 0 && (
                <span
                  className="flex items-center gap-1"
                  aria-label={t('subtasksCount', { count: task.subtasks.length })}
                >
                  <Layers className="h-3 w-3" aria-hidden="true" />
                  <span aria-hidden="true">{task.subtasks.length}</span>
                </span>
              )}
              <span>{getRelativeTime(task.updatedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
