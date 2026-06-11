import { Suspense } from 'react';
import { getTasks } from '@/lib/api';
import { TaskBoard } from '@/components/tasks/task-board';
import { TaskListView } from '@/components/tasks/task-list-view';
import { TopBar } from '@/components/layout/top-bar';

interface PageProps {
  searchParams: Promise<{
    view?: string;
    search?: string;
    sortBy?: string;
    order?: string;
  }>;
}

export default async function TasksPage({ searchParams }: PageProps) {
  const { view = 'board', search, sortBy, order } = await searchParams;
  const tasks = await getTasks({ search, sortBy, order });

  return (
    <div className="flex flex-col h-full">
      <Suspense>
        <TopBar />
      </Suspense>
      <div className="flex-1 overflow-auto p-6">
        {view === 'board' ? <TaskBoard initialTasks={tasks} /> : <TaskListView tasks={tasks} />}
      </div>
    </div>
  );
}
