import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('../ai/client.js', () => ({
  AI_MODEL: 'test-model',
  getAnthropicClient: () => ({ messages: { create: mockCreate } }),
  stripJsonFences: (t: string) => t,
}));

import app from '../index.js';
import db from '../db/index.js';

beforeEach(() => {
  db.exec('DELETE FROM tasks');
  vi.clearAllMocks();
});

describe('POST /api/ai/tasks/:id/subtasks', () => {
  it('returns generated subtask titles', async () => {
    const { body: task } = await request(app)
      .post('/api/tasks')
      .send({ title: 'Build auth', description: 'OAuth2 flow' });

    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'Reasoning: scope and phases.' }] })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: '["Design schema", "Implement endpoints"]' }],
      });

    const res = await request(app).post(`/api/ai/tasks/${task.id}/subtasks`);

    expect(res.status).toBe(200);
    expect(res.body.subtasks).toEqual(['Design schema', 'Implement endpoints']);
  });

  it('caps the list at MAX_SUBTASKS items', async () => {
    const { body: task } = await request(app).post('/api/tasks').send({ title: 'Big task' });

    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'Reasoning...' }] })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: '["A","B","C","D","E","F","G"]' }],
      });

    const res = await request(app).post(`/api/ai/tasks/${task.id}/subtasks`);
    expect(res.body.subtasks.length).toBeLessThanOrEqual(5);
    expect(res.body.subtasks.length).toBeGreaterThan(0);
  });

  it('returns 404 for an unknown task id', async () => {
    const res = await request(app).post('/api/ai/tasks/nonexistent/subtasks');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/ai/tasks/:id/update', () => {
  it('returns a Slack-style message string', async () => {
    const { body: task } = await request(app)
      .post('/api/tasks')
      .send({ title: 'Fix login bug', status: 'in-progress' });

    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'Assessment: task in progress.' }] })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: '*Fix login bug* is currently in progress.' }],
      });

    const res = await request(app).post(`/api/ai/tasks/${task.id}/update`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('*Fix login bug* is currently in progress.');
  });

  it('returns 404 for an unknown task id', async () => {
    const res = await request(app).post('/api/ai/tasks/nonexistent/update');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/ai/analyse', () => {
  it('returns title, description, and task list', async () => {
    await request(app).post('/api/tasks').send({ title: 'Migrate DB', priority: 'high' });

    mockCreate
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'Triage: one critical migration.' }] })
      .mockResolvedValueOnce({
        content: [
          {
            type: 'text',
            text: '{"title":"One Critical Task","description":"Focus on the migration.","tasks":["Migrate DB"]}',
          },
        ],
      });

    const res = await request(app).post('/api/ai/analyse');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('One Critical Task');
    expect(res.body.description).toBe('Focus on the migration.');
    expect(res.body.tasks).toContain('Migrate DB');
  });

  it('returns an empty state without calling the model when there are no tasks', async () => {
    const res = await request(app).post('/api/ai/analyse');

    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([]);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
