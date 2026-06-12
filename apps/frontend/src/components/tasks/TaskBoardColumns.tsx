import { memo } from 'react';
import type { Task, TaskStatus } from '@/lib/types';
import { DroppableColumn } from './TaskDroppableColumn';

interface ColumnConfig {
  id: TaskStatus;
  label: string;
}

interface TaskBoardColumnsProps {
  tasksByStatus: Record<TaskStatus, Task[]>;
  columns: ColumnConfig[];
  newTaskLabel: string;
}

export const TaskBoardColumns = memo(function TaskBoardColumns({
  tasksByStatus,
  columns,
  newTaskLabel,
}: TaskBoardColumnsProps) {
  return (
    <div className="flex gap-5 min-h-full overflow-x-auto pb-4">
      {columns.map((col) => (
        <DroppableColumn
          key={col.id}
          id={col.id}
          label={col.label}
          tasks={tasksByStatus[col.id]}
          newTaskLabel={newTaskLabel}
        />
      ))}
    </div>
  );
});
