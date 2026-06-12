import { Router, Request, Response } from 'express';
import db from '../db/index.js';
import { getAnthropicClient, AI_MODEL, stripJsonFences } from '../ai/client.js';
import { TaskRow } from '../types.js';

const router = Router();

const MAX_SUBTASKS = 3;

// POST /api/ai/tasks/:id/subtasks
router.post('/tasks/:id/subtasks', async (req: Request, res: Response) => {
  const row = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND parent_id IS NULL')
    .get(req.params.id) as TaskRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const existingSubtasks = db
    .prepare('SELECT title FROM tasks WHERE parent_id = ?')
    .all(row.id) as Pick<TaskRow, 'title'>[];

  const existingSection =
    existingSubtasks.length > 0
      ? `\nExisting subtasks (do NOT suggest anything similar to these):\n${existingSubtasks.map((s) => `- ${s.title}`).join('\n')}\n`
      : '';

  try {
    const message = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `You are a project management assistant. Given the following task, suggest up to ${MAX_SUBTASKS} concrete, actionable subtasks.

Task title: ${row.title}
Task description: ${row.description || '(none)'}${existingSection}
Return ONLY a JSON array of strings with no markdown, no explanation, no code blocks. Example: ["Subtask 1", "Subtask 2"]`,
        },
      ],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '[]';
    const subtasks = JSON.parse(stripJsonFences(raw)) as string[];

    if (!Array.isArray(subtasks)) {
      throw new Error('Expected array');
    }

    res.json({
      subtasks: subtasks.slice(0, MAX_SUBTASKS).filter((s) => typeof s === 'string' && s.trim()),
    });
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
          content: `You are an engineering communication specialist. Generate a concise, professional Slack status update for the following task.

Requirements:
- 2-3 sentences maximum
- Lead with current status and key progress
- Flag blockers or next actions if applicable
- Use Slack markdown (*bold* for emphasis, \`code\` for technical terms)
- Tone: direct, factual, no filler phrases

Task data:
Title: ${row.title}
Description: ${row.description || '(none)'}
Status: ${row.status}
Priority: ${row.priority}
Subtasks:
${subtasksSummary}

Output the message text only. No preamble, no explanation.`,
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
          content: `You are a senior engineering lead performing a daily workload triage.

Tasks (sorted by priority):
${taskList}

Produce a focused daily plan. Output must contain:
1. title — 6 words or fewer, action-oriented, no filler (e.g. "Clear the high-priority backlog")
2. description — 1-2 sentences: state the dominant risk or theme, and the single most important focus area
3. tasks — 3-5 task titles ranked by impact and urgency; skip anything already done

Constraints:
- Prioritize high-priority and in-progress items
- Surface blockers or dependencies if evident from task names
- No motivational language, no padding

Return ONLY valid JSON matching this exact shape, no markdown fences:
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
