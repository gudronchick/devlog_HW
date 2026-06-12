import { Suspense, lazy } from 'react';
import { getTasks } from '@/lib/api';
import { TopBar } from '@/components/layout/TopBar';
import { AnalysisPromptBanner } from '@/components/tasks/AnalysisPromptBanner';

const TaskBoard = lazy(() =>
  import('@/components/tasks/TaskBoard').then((m) => ({ default: m.TaskBoard }))
);
const TaskListView = lazy(() =>
  import('@/components/tasks/TaskListView').then((m) => ({ default: m.TaskListView }))
);

interface PageProps {
  searchParams: Promise<{
    view?: string;
    search?: string;
    sortBy?: string;
    order?: string;
  }>;
}

const TasksPage = async ({ searchParams }: PageProps) => {
  const { view = 'board', search, sortBy, order } = await searchParams;
  const tasks = await getTasks({ search, sortBy, order });

  return (
    <div className="flex flex-col h-full">
      <Suspense>
        <TopBar />
      </Suspense>
      <AnalysisPromptBanner />
      <div className="flex-1 overflow-auto p-6">
        <Suspense>
          {view === 'board' ? <TaskBoard initialTasks={tasks} /> : <TaskListView tasks={tasks} />}
        </Suspense>
      </div>
    </div>
  );
};

export default TasksPage;
