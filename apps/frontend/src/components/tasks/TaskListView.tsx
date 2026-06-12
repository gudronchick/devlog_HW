import { getTranslations } from 'next-intl/server';
import { ClipboardList } from 'lucide-react';
import type { Task } from '@/lib/types';
import { TaskCard } from './TaskCard';

interface TaskListViewProps {
  tasks: Task[];
}

export const TaskListView = async ({ tasks }: TaskListViewProps) => {
  const t = await getTranslations('board');

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <ClipboardList className="h-10 w-10 opacity-30" aria-hidden="true" />
        <p className="text-sm">{t('list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
};
