'use client';

import { useTranslations } from 'next-intl';
import { ClipboardList } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { TaskCard, type TaskCardTranslations } from './task-card';

interface TaskListViewProps {
  tasks: Task[];
}

export function TaskListView({ tasks }: TaskListViewProps) {
  const t = useTranslations('board');

  const cardT: TaskCardTranslations = {
    deleteAriaLabel: t('card.deleteAriaLabel'),
    statusLabels: {
      todo: t('card.statusTodo'),
      'in-progress': t('card.statusInProgress'),
      done: t('card.statusDone'),
    } as Record<TaskStatus, string>,
    priorityLabels: {
      low: t('card.priorityLow'),
      medium: t('card.priorityMedium'),
      high: t('card.priorityHigh'),
    } as Record<TaskPriority, string>,
  };

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <ClipboardList className="h-10 w-10 opacity-30" />
        <p className="text-sm">{t('list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} t={cardT} />
      ))}
    </div>
  );
}
