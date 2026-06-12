'use client';

import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { TaskCard } from './TaskCard';

export const DraggableCard = memo(function DraggableCard({ task }: { task: Task }) {
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
});
