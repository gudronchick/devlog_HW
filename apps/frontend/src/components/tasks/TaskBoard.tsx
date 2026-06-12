'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { Task, TaskStatus } from '@/lib/types';
import { updateTaskAction } from '@/lib/actions';
import { TaskBoardColumns } from './TaskBoardColumns';
import { TaskCard } from './TaskCard';

export const TaskBoard = ({ initialTasks }: { initialTasks: Task[] }) => {
  const t = useTranslations('board');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const columns = useMemo<{ id: TaskStatus; label: string }[]>(
    () => [
      { id: 'todo', label: t('column.todo') },
      { id: 'in-progress', label: t('column.inProgress') },
      { id: 'done', label: t('column.done') },
    ],
    [t]
  );

  // Pre-group tasks by status so DroppableColumn receives stable array references
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = { todo: [], 'in-progress': [], done: [] };
    for (const task of tasks) grouped[task.status].push(task);
    return grouped;
  }, [tasks]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      setActiveTask(tasks.find((task) => task.id === active.id) ?? null);
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus;
      const task = tasks.find((task) => task.id === taskId);

      if (!task || task.status === newStatus) return;

      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

      try {
        await updateTaskAction(taskId, { status: newStatus });
      } catch {
        setTasks(initialTasks);
      }
    },
    [tasks, initialTasks]
  );

  return (
    <DndContext id="task-board" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <TaskBoardColumns
        tasksByStatus={tasksByStatus}
        columns={columns}
        newTaskLabel={t('toolbar.newTask')}
      />
      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskCard task={activeTask} className="rotate-1 shadow-xl opacity-95" />}
      </DragOverlay>
    </DndContext>
  );
};
