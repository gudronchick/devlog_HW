'use server';

import { revalidatePath } from 'next/cache';
import { createTask, deleteTask, updateTask } from './api';
import type { CreateTaskInput, UpdateTaskInput } from './types';

export async function updateTaskAction(id: string, data: UpdateTaskInput) {
  const result = await updateTask(id, data);
  revalidatePath('/');
  revalidatePath(`/tasks/${id}`);
  return result;
}

export async function deleteTaskAction(id: string) {
  await deleteTask(id);
  revalidatePath('/');
}

export async function deleteSubtaskAction(id: string, parentId: string) {
  await deleteTask(id);
  revalidatePath(`/tasks/${parentId}`);
}

export async function createSubtasksAction(subtasks: CreateTaskInput[], parentId: string) {
  await Promise.all(subtasks.map((s) => createTask(s)));
  revalidatePath(`/tasks/${parentId}`);
}
