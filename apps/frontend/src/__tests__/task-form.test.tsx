import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCreateForm } from '@/components/tasks/task-form';

const mockPush = vi.hoisted(() => vi.fn());
const mockCreateTask = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/api', () => ({
  createTask: mockCreateTask,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

describe('TaskCreateForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the title input and submit button', () => {
    render(<TaskCreateForm />);
    expect(screen.getByPlaceholderText('What needs to be done?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
  });

  it('disables the submit button when the title is empty', () => {
    render(<TaskCreateForm />);
    expect(screen.getByRole('button', { name: /create task/i })).toBeDisabled();
  });

  it('enables the submit button once a title is typed', async () => {
    render(<TaskCreateForm />);
    await userEvent.type(screen.getByPlaceholderText('What needs to be done?'), 'My task');
    expect(screen.getByRole('button', { name: /create task/i })).toBeEnabled();
  });

  it('calls createTask with the trimmed title on submit', async () => {
    mockCreateTask.mockResolvedValueOnce({ id: 'new-1', title: 'My task' });

    render(<TaskCreateForm />);
    await userEvent.type(screen.getByPlaceholderText('What needs to be done?'), 'My task');
    await userEvent.click(screen.getByRole('button', { name: /create task/i }));

    expect(mockCreateTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My task' })
    );
  });

  it('redirects to the new task page after creation', async () => {
    mockCreateTask.mockResolvedValueOnce({ id: 'new-1', title: 'My task' });

    render(<TaskCreateForm />);
    await userEvent.type(screen.getByPlaceholderText('What needs to be done?'), 'My task');
    await userEvent.click(screen.getByRole('button', { name: /create task/i }));

    expect(mockPush).toHaveBeenCalledWith('/tasks/new-1');
  });
});
