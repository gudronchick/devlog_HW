'use client';

import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Task, TaskStatus } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { DraggableCard } from './TaskDraggableCard';

interface DroppableColumnProps {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  newTaskLabel: string;
}

export const DroppableColumn = memo(function DroppableColumn({ id, label, tasks, newTaskLabel }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const t = useTranslations('board.column');

  return (
    <div className="flex-1 min-w-[260px] flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {label}
        </h3>
        <span
          className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 font-medium"
          aria-label={t('taskCount', { count: tasks.length })}
          aria-live="polite"
        >
          <span aria-hidden="true">{tasks.length}</span>
        </span>
      </div>

      <div
        ref={setNodeRef}
        aria-label={label}
        className={cn(
          'flex-1 min-h-[120px] flex flex-col gap-3 rounded-xl p-3 transition-colors bg-muted/40',
          isOver && 'bg-primary/10 ring-2 ring-primary/20'
        )}
      >
        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-20 text-muted-foreground/40" aria-hidden="true">
            <ClipboardList className="h-6 w-6" />
          </div>
        )}

        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} />
        ))}

        {id === 'todo' && (
          <Link href="/tasks/new">
            <Button
              variant="ghost"
              className="w-full h-10 border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {newTaskLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
});
