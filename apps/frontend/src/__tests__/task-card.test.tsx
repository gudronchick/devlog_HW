import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCard } from '@/components/tasks/TaskCard';
import type { Task } from '@/lib/types';

const mockRefresh = vi.hoisted(() => vi.fn());
const mockDeleteTask = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/api', () => ({
  deleteTask: mockDeleteTask,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => ({
    deleteAriaLabel: 'Delete task',
    statusTodo: 'Todo',
    statusInProgress: 'In Progress',
    statusDone: 'Done',
    priorityLow: 'Low',
    priorityMedium: 'Medium',
    priorityHigh: 'High',
  }[key] ?? key),
}));

const task: Task = {
  id: 'task-1',
  parentId: null,
  title: 'Fix the login bug',
  description: 'Users cannot log in with SSO',
  status: 'in-progress',
  priority: 'high',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  subtasks: [],
};

describe('TaskCard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the task title', () => {
    render(<TaskCard task={task} />);
    expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
  });

  it('renders the priority badge', () => {
    render(<TaskCard task={task} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders the status badge', () => {
    render(<TaskCard task={task} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders the description', () => {
    render(<TaskCard task={task} />);
    expect(screen.getByText('Users cannot log in with SSO')).toBeInTheDocument();
  });

  it('calls deleteTask and refreshes on delete button click', async () => {
    mockDeleteTask.mockResolvedValueOnce(undefined);
    render(<TaskCard task={task} />);

    await userEvent.click(screen.getByLabelText('Delete task'));

    expect(mockDeleteTask).toHaveBeenCalledWith('task-1');
    expect(mockRefresh).toHaveBeenCalled();
  });
});
