import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import db from '../db/index.js';

beforeEach(() => {
  db.exec('DELETE FROM tasks');
});

describe('POST /api/tasks', () => {
  it('creates a task and returns 201 with defaults', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'Test task' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Test task');
    expect(res.body.status).toBe('todo');
    expect(res.body.priority).toBe('medium');
    expect(res.body.id).toBeTruthy();
    expect(res.body.subtasks).toEqual([]);
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/tasks').send({ description: 'no title' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid status', async () => {
    const res = await request(app).post('/api/tasks').send({ title: 'T', status: 'invalid' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tasks', () => {
  it('returns empty array when no tasks exist', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all top-level tasks', async () => {
    await request(app).post('/api/tasks').send({ title: 'Task 1' });
    await request(app).post('/api/tasks').send({ title: 'Task 2' });

    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('filters by search term in title', async () => {
    await request(app).post('/api/tasks').send({ title: 'Fix login bug' });
    await request(app).post('/api/tasks').send({ title: 'Update docs' });

    const res = await request(app).get('/api/tasks?search=login');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Fix login bug');
  });

  it('does not return subtasks in the top-level list', async () => {
    const { body: parent } = await request(app).post('/api/tasks').send({ title: 'Parent' });
    await request(app).post('/api/tasks').send({ title: 'Child', parentId: parent.id });

    const res = await request(app).get('/api/tasks');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Parent');
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns the task with its subtasks', async () => {
    const { body: parent } = await request(app).post('/api/tasks').send({ title: 'Parent task' });
    await request(app).post('/api/tasks').send({ title: 'Subtask 1', parentId: parent.id });

    const res = await request(app).get(`/api/tasks/${parent.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Parent task');
    expect(res.body.subtasks).toHaveLength(1);
    expect(res.body.subtasks[0].title).toBe('Subtask 1');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/tasks/nonexistent');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('updates title and status', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ title: 'Original' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ title: 'Updated', status: 'in-progress' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.status).toBe('in-progress');
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).patch('/api/tasks/nonexistent').send({ title: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes the task and returns 204', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ title: 'To delete' });

    const deleteRes = await request(app).delete(`/api/tasks/${task.id}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app).get(`/api/tasks/${task.id}`);
    expect(getRes.status).toBe(404);
  });

  it('cascades to subtasks', async () => {
    const { body: parent } = await request(app).post('/api/tasks').send({ title: 'Parent' });
    await request(app).post('/api/tasks').send({ title: 'Child', parentId: parent.id });

    await request(app).delete(`/api/tasks/${parent.id}`);

    const res = await request(app).get('/api/tasks');
    expect(res.body).toHaveLength(0);
  });

  it('returns 404 when deleting a nonexistent task', async () => {
    const res = await request(app).delete('/api/tasks/nonexistent');
    expect(res.status).toBe(404);
  });
});
