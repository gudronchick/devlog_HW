import { TaskPriority, TaskStatus } from '@/lib/types';

export const PRIORITY_KEY: Record<TaskPriority, 'priorityLow' | 'priorityMedium' | 'priorityHigh'> =
  {
    low: 'priorityLow',
    medium: 'priorityMedium',
    high: 'priorityHigh',
  };

export const STATUS_KEY: Record<TaskStatus, 'statusTodo' | 'statusInProgress' | 'statusDone'> = {
  todo: 'statusTodo',
  'in-progress': 'statusInProgress',
  done: 'statusDone',
};

export const PRIORITY_CLASS: Record<TaskPriority, string> = {
  high: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
};

export const STATUS_BORDER: Record<TaskStatus, string> = {
  todo: 'border-l-slate-300 dark:border-l-slate-600',
  'in-progress': 'border-l-blue-400 dark:border-l-blue-500',
  done: 'border-l-emerald-400 dark:border-l-emerald-500',
};

export const STATUS_BADGE: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  'in-progress': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  done: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400',
};
