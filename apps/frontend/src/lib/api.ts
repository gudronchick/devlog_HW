import type { Task, CreateTaskInput, UpdateTaskInput } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface GetTasksParams {
  search?: string;
  sortBy?: string;
  order?: string;
}

export function getTasks(params?: GetTasksParams): Promise<Task[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.sortBy) qs.set('sortBy', params.sortBy);
  if (params?.order) qs.set('order', params.order);
  const query = qs.toString();
  return request<Task[]>(`/api/tasks${query ? `?${query}` : ''}`, { cache: 'no-store' });
}

export function getTask(id: string): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`, { cache: 'no-store' });
}

export function createTask(data: CreateTaskInput): Promise<Task> {
  return request<Task>('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export function deleteTask(id: string): Promise<void> {
  return request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
}
