'use client';

import { useEffect, useState } from 'react';
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

  const COLUMNS: { id: TaskStatus; label: string }[] = [
    { id: 'todo', label: t('column.todo') },
    { id: 'in-progress', label: t('column.inProgress') },
    { id: 'done', label: t('column.done') },
  ];

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(tasks.find((task) => task.id === active.id) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
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
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <TaskBoardColumns tasks={tasks} columns={COLUMNS} newTaskLabel={t('toolbar.newTask')} />
      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskCard task={activeTask} className="rotate-1 shadow-xl opacity-95" />}
      </DragOverlay>
    </DndContext>
  );
};
