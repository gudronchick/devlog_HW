import { notFound } from 'next/navigation';
import { getTask } from '@/lib/api';
import { TaskDetailClient } from '@/components/tasks/TaskDetailClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

const TaskDetailPage = async ({ params }: PageProps) => {
  const { id } = await params;

  try {
    const task = await getTask(id);
    return <TaskDetailClient task={task} />;
  } catch {
    notFound();
  }
};

export default TaskDetailPage;
