import { notFound } from 'next/navigation';
import { getTask } from '@/lib/api';
import { TaskDetailClient } from '@/components/tasks/task-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const task = await getTask(id);
    return <TaskDetailClient task={task} />;
  } catch {
    notFound();
  }
}
