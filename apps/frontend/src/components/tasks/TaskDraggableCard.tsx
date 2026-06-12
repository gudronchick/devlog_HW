'use client';

import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@/lib/types';
import { TaskCard } from './TaskCard';
import { cn } from '@/lib/utils';

export const DraggableCard = ({ task }: { task: Task }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      className={cn('touch-none', isDragging && 'opacity-40')}
      {...listeners}
      {...attributes}
    >
      <TaskCard task={task} />
    </div>
  );
};
