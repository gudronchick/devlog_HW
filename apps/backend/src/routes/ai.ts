import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { getAnthropicClient, AI_MODEL, stripJsonFences } from '../ai/client.js';
import { TaskRow } from '../types.js';

const router = Router();

// POST /api/ai/tasks/:id/subtasks
router.post('/tasks/:id/subtasks', async (req: Request, res: Response) => {
  const row = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND parent_id IS NULL')
    .get(req.params.id) as TaskRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  try {
    const message = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a project management assistant. Given the following task, suggest up to 5 concrete, actionable subtasks.

Task title: ${row.title}
Task description: ${row.description || '(none)'}

Return ONLY a JSON array of strings with no markdown, no explanation, no code blocks. Example: ["Subtask 1", "Subtask 2"]`,
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const subtasks = JSON.parse(stripJsonFences(raw)) as string[];

    if (!Array.isArray(subtasks)) throw new Error('Expected array');

    res.json({ subtasks: subtasks.slice(0, 5).filter((s) => typeof s === 'string' && s.trim()) });
  } catch (err) {
    console.error('AI subtask generation failed:', err);
    res.status(500).json({ error: 'Failed to generate subtasks' });
  }
});

// POST /api/ai/tasks/:id/update
router.post('/tasks/:id/update', async (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as
    | TaskRow
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const subtasks = db
    .prepare('SELECT title, status FROM tasks WHERE parent_id = ?')
    .all(row.id) as Pick<TaskRow, 'title' | 'status'>[];

  const subtasksSummary =
    subtasks.length > 0
      ? subtasks.map((s) => `- ${s.title} (${s.status})`).join('\n')
      : 'No subtasks';

  try {
    const message = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `You are a helpful assistant that writes concise Slack status updates for engineering tasks.

Write a brief Slack-style message (2-3 sentences) summarizing the current state of this task. Use Slack markdown where appropriate (*bold*, \`code\`). Be direct and professional.

Title: ${row.title}
Description: ${row.description || '(none)'}
Status: ${row.status}
Priority: ${row.priority}
Subtasks:
${subtasksSummary}

Return ONLY the message text, nothing else.`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    res.json({ message: text });
  } catch (err) {
    console.error('AI update generation failed:', err);
    res.status(500).json({ error: 'Failed to generate update' });
  }
});

// POST /api/ai/analyse
router.post('/analyse', async (req: Request, res: Response) => {
  const rows = db
    .prepare(
      `SELECT id, title, description, status, priority FROM tasks WHERE parent_id IS NULL ORDER BY
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`
    )
    .all() as Pick<TaskRow, 'id' | 'title' | 'description' | 'status' | 'priority'>[];

  if (rows.length === 0) {
    res.json({
      title: 'No tasks yet',
      description: 'Your board is empty. Start by creating some tasks.',
      tasks: [],
    });
    return;
  }

  const subtaskCounts = db
    .prepare(
      `SELECT parent_id, COUNT(*) as count FROM tasks WHERE parent_id IS NOT NULL GROUP BY parent_id`
    )
    .all() as { parent_id: string; count: number }[];
  const countMap = new Map(subtaskCounts.map((r) => [r.parent_id, r.count]));

  const taskList = rows
    .map((r, i) => {
      const subs = countMap.get(r.id) ?? 0;
      return `${i + 1}. [${r.priority.toUpperCase()}] ${r.title} (${r.status})${r.description ? ` — ${r.description.slice(0, 80)}` : ''}${subs > 0 ? ` [${subs} subtasks]` : ''}`;
    })
    .join('\n');

  try {
    const message = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a project management assistant helping an engineer plan their day.

Here are all current tasks:
${taskList}

Analyze the workload and provide:
1. A short motivating title (max 8 words)
2. A 1-2 sentence description of the overall state and what to focus on
3. A prioritized list of 3-5 task titles the engineer should tackle today

Return ONLY valid JSON with exactly this shape and no markdown:
{"title": "...", "description": "...", "tasks": ["task title 1", "task title 2"]}`,
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const result = JSON.parse(stripJsonFences(raw)) as {
      title: string;
      description: string;
      tasks: string[];
    };

    if (!result.title || !result.description || !Array.isArray(result.tasks)) {
      throw new Error('Unexpected response shape');
    }

    res.json(result);
  } catch (err) {
    console.error('AI day analysis failed:', err);
    res.status(500).json({ error: 'Failed to analyse tasks' });
  }
});

export default router;
