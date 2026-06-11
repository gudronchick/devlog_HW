export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type SortBy = 'priority' | 'createdAt' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface Task {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  subtasks: Task[];
}

// Raw row shape coming out of SQLite
export interface TaskRow {
  id: string;
  parent_id: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: string;
  updated_at: string;
}
