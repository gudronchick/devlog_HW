import { ClipboardList } from 'lucide-react';
import type { Task } from '@/lib/types';
import { TaskCard } from './task-card';

interface TaskListViewProps {
  tasks: Task[];
}

export function TaskListView({ tasks }: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <ClipboardList className="h-10 w-10 opacity-30" />
        <p className="text-sm">No tasks yet. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}
