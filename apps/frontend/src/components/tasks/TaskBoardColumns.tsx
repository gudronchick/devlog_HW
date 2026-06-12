import type { Task, TaskStatus } from '@/lib/types';
import { DroppableColumn } from './TaskDroppableColumn';

interface ColumnConfig {
  id: TaskStatus;
  label: string;
}

interface TaskBoardColumnsProps {
  tasks: Task[];
  columns: ColumnConfig[];
  newTaskLabel: string;
}

export const TaskBoardColumns = ({ tasks, columns, newTaskLabel }: TaskBoardColumnsProps) => (
  <div className="flex gap-5 h-full overflow-x-auto pb-4">
    {columns.map((col) => (
      <DroppableColumn
        key={col.id}
        id={col.id}
        label={col.label}
        tasks={tasks.filter((task) => task.status === col.id)}
        newTaskLabel={newTaskLabel}
      />
    ))}
  </div>
);
