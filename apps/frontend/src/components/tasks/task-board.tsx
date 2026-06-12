'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import type { Task, TaskStatus } from '@/lib/types';
import { updateTask } from '@/lib/api';
import { TaskCard, type TaskCardTranslations } from './task-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DroppableColumnProps {
  id: TaskStatus;
  label: string;
  tasks: Task[];
  cardT: TaskCardTranslations;
  newTaskLabel: string;
}

function DroppableColumn({ id, label, tasks, cardT, newTaskLabel }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex-1 min-w-[260px] flex flex-col">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          {label}
        </h3>
        <span className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 font-medium">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] flex flex-col gap-3 rounded-xl p-3 transition-colors bg-muted/40',
          isOver && 'bg-primary/10 ring-2 ring-primary/20'
        )}
      >
        {tasks.length === 0 && !isOver && (
          <div className="flex items-center justify-center h-20 text-muted-foreground/40">
            <ClipboardList className="h-6 w-6" />
          </div>
        )}

        {tasks.map((task) => (
          <DraggableCard key={task.id} task={task} cardT={cardT} />
        ))}

        {id === 'todo' && (
          <Link href="/tasks/new">
            <Button
              variant="ghost"
              className="w-full h-10 border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              {newTaskLabel}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function DraggableCard({ task, cardT }: { task: Task; cardT: TaskCardTranslations }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <div
      ref={setNodeRef}
      className={cn('touch-none', isDragging && 'opacity-40')}
      {...listeners}
      {...attributes}
    >
      <TaskCard task={task} t={cardT} />
    </div>
  );
}

export function TaskBoard({ initialTasks }: { initialTasks: Task[] }) {
  const router = useRouter();
  const t = useTranslations('board');
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const cardT: TaskCardTranslations = {
    deleteAriaLabel: t('card.deleteAriaLabel'),
    statusLabels: {
      todo: t('card.statusTodo'),
      'in-progress': t('card.statusInProgress'),
      done: t('card.statusDone'),
    },
    priorityLabels: {
      low: t('card.priorityLow'),
      medium: t('card.priorityMedium'),
      high: t('card.priorityHigh'),
    },
  };

  const COLUMNS: { id: TaskStatus; label: string }[] = [
    { id: 'todo', label: t('column.todo') },
    { id: 'in-progress', label: t('column.inProgress') },
    { id: 'done', label: t('column.done') },
  ];

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((task) => task.id === event.active.id) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const task = tasks.find((task) => task.id === taskId);

    if (!task || task.status === newStatus) return;

    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)));

    try {
      await updateTask(taskId, { status: newStatus });
      router.refresh();
    } catch {
      setTasks(initialTasks);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-5 h-full overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            id={col.id}
            label={col.label}
            tasks={tasks.filter((task) => task.status === col.id)}
            cardT={cardT}
            newTaskLabel={t('toolbar.newTask')}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <TaskCard task={activeTask} t={cardT} className="rotate-1 shadow-xl opacity-95" />
        )}
      </DragOverlay>
    </DndContext>
  );
}
