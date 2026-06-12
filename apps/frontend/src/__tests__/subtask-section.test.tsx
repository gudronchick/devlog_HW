import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubtaskSection } from '@/components/tasks/SubtaskSection';
import type { Task } from '@/lib/types';

const mockRefresh = vi.hoisted(() => vi.fn());
const mockGenerateSubtasks = vi.hoisted(() => vi.fn());
const mockCreateTask = vi.hoisted(() => vi.fn());
const mockDeleteTask = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('@/lib/api', () => ({
  generateSubtasks: mockGenerateSubtasks,
  createTask: mockCreateTask,
  deleteTask: mockDeleteTask,
}));

const baseTask: Task = {
  id: 'task-1',
  parentId: null,
  title: 'Build feature',
  description: 'A shiny new feature',
  status: 'todo',
  priority: 'medium',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  subtasks: [],
};

describe('SubtaskSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the empty state when there are no subtasks', () => {
    render(<SubtaskSection task={baseTask} />);
    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('lists existing subtask titles', () => {
    const subtask: Task = { ...baseTask, id: 'sub-1', title: 'Do the thing', subtasks: [] };
    render(<SubtaskSection task={{ ...baseTask, subtasks: [subtask] }} />);
    expect(screen.getByText('Do the thing')).toBeInTheDocument();
  });

  it('calls generateSubtasks with the task id and shows suggestions', async () => {
    mockGenerateSubtasks.mockResolvedValueOnce({ subtasks: ['Step 1', 'Step 2'] });

    render(<SubtaskSection task={baseTask} />);
    await userEvent.click(screen.getByRole('button', { name: 'generateButton' }));

    expect(mockGenerateSubtasks).toHaveBeenCalledWith('task-1');

    await waitFor(() => {
      expect(screen.getByDisplayValue('Step 1')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Step 2')).toBeInTheDocument();
    });
  });

  it('calls createTask for each suggestion when Approve is clicked', async () => {
    mockGenerateSubtasks.mockResolvedValueOnce({ subtasks: ['Step A', 'Step B'] });
    mockCreateTask.mockResolvedValue({ id: 'new-sub' });

    render(<SubtaskSection task={baseTask} />);
    await userEvent.click(screen.getByRole('button', { name: 'generateButton' }));
    await waitFor(() => screen.getByDisplayValue('Step A'));

    await userEvent.click(screen.getByRole('button', { name: 'approve' }));

    expect(mockCreateTask).toHaveBeenCalledTimes(2);
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Step A', parentId: 'task-1' })
    );
    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Step B', parentId: 'task-1' })
    );
  });

  it('hides suggestions when Discard is clicked', async () => {
    mockGenerateSubtasks.mockResolvedValueOnce({ subtasks: ['Step X'] });

    render(<SubtaskSection task={baseTask} />);
    await userEvent.click(screen.getByRole('button', { name: 'generateButton' }));
    await waitFor(() => screen.getByDisplayValue('Step X'));

    await userEvent.click(screen.getByRole('button', { name: 'discard' }));

    expect(screen.queryByDisplayValue('Step X')).not.toBeInTheDocument();
  });
});
