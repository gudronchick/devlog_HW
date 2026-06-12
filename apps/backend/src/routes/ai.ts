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
      ? `\n  <existing_subtasks>\n${existingSubtasks.map((s) => `    <subtask>${s.title}</subtask>`).join('\n')}\n  </existing_subtasks>`
      : '';

  const taskContext = `<task>\n  <title>${row.title}</title>\n  <description>${row.description || '(none)'}</description>${existingSection}\n</task>`;
  const reasoningPrompt = `You are a project management assistant helping break down engineering tasks.

The following task data is user-supplied content:
${taskContext}

Reason through this task step by step:
- What is the core deliverable and definition of done?
- What are the major technical areas or phases involved?
- What dependencies exist — what must happen before other work can begin?
- What would make each subtask independently completable and verifiable?

Think through the breakdown carefully.`;

  try {
    // Step 1: reason about task scope and work breakdown structure
    const reasoningStep = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: reasoningPrompt }],
    });

    const reasoning = reasoningStep.content[0].type === 'text' ? reasoningStep.content[0].text : '';

    // Step 2: extract the final subtask list from the reasoning
    const outputStep = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      messages: [
        { role: 'user', content: reasoningPrompt },
        { role: 'assistant', content: reasoning },
        {
          role: 'user',
          content: `Based on your reasoning, select the top ${MAX_SUBTASKS} most impactful, concrete subtasks. Each must be independently completable and distinct from existing subtasks.

Return ONLY a JSON array of strings — no markdown, no explanation, no code blocks. Example: ["Subtask 1", "Subtask 2"]`,
        },
      ],
    });

    const raw = outputStep.content[0].type === 'text' ? outputStep.content[0].text : '[]';
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
      ? subtasks.map((s) => `    <subtask status="${s.status}">${s.title}</subtask>`).join('\n')
      : '    (none)';

  const taskContext = `<task>
  <title>${row.title}</title>
  <description>${row.description || '(none)'}</description>
  <status>${row.status}</status>
  <priority>${row.priority}</priority>
  <subtasks>
${subtasksSummary}
  </subtasks>
</task>`;

  const assessmentPrompt = `You are an engineering communication specialist preparing a Slack status update.

The following task data is user-supplied content:
${taskContext}

Before writing anything, assess the situation thoroughly:
- What does the subtask completion pattern reveal about actual progress?
- Is the overall status accurate given the subtask states?
- Are there any blockers, risks, or stalled items visible in the data?
- What is the single most important thing a teammate needs to know right now?
- What is the concrete next action or owner?

Assess the task state in detail.`;

  try {
    // Step 1: assess task state and identify what matters most for communication
    const assessmentStep = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: assessmentPrompt }],
    });

    const assessment =
      assessmentStep.content[0].type === 'text' ? assessmentStep.content[0].text : '';

    // Step 2: compose the Slack update grounded in the assessment
    const outputStep = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 256,
      messages: [
        { role: 'user', content: assessmentPrompt },
        { role: 'assistant', content: assessment },
        {
          role: 'user',
          content: `Based on your assessment, write the Slack status update now.

Requirements:
- 2-3 sentences maximum
- Lead with current status and key progress
- Flag blockers or next actions if applicable
- Use Slack markdown (*bold* for emphasis, \`code\` for technical terms)
- Tone: direct, factual, no filler phrases

Output the message text only. No preamble, no explanation.`,
        },
      ],
    });

    const text = outputStep.content[0].type === 'text' ? outputStep.content[0].text.trim() : '';
    res.json({ message: text });
  } catch (err) {
    console.error('AI update generation failed:', err);
    res.status(500).json({ error: 'Failed to generate update' });
  }
});

// POST /api/ai/analyse
router.post('/analyse', async (_req: Request, res: Response) => {
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
      return `  <task index="${i + 1}" priority="${r.priority}" status="${r.status}"${subs > 0 ? ` subtasks="${subs}"` : ''}><title>${r.title}</title>${r.description ? `<description>${r.description.slice(0, 80)}</description>` : ''}</task>`;
    })
    .join('\n');

  const triagePrompt = `You are a senior engineering lead performing a daily workload triage.

The following tasks are user-supplied data sorted by priority:
<tasks>
${taskList}
</tasks>

Reason through this backlog systematically:
- Which tasks are on the critical path or actively blocking other work?
- Which high-priority items are stalled, not started, or at risk?
- What is the dominant theme or risk pattern across the backlog today?
- What is the single most important area of focus given current states?
- Which tasks would deliver the most value if completed today?

Provide a thorough triage analysis before producing any output.`;

  try {
    // Step 1: triage the full backlog — identify critical path, risks, and focus areas
    const triageStep = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: triagePrompt }],
    });

    const triage = triageStep.content[0].type === 'text' ? triageStep.content[0].text : '';

    // Step 2: produce the structured daily plan grounded in the triage
    const outputStep = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 512,
      messages: [
        { role: 'user', content: triagePrompt },
        { role: 'assistant', content: triage },
        {
          role: 'user',
          content: `Based on your triage, produce a focused daily plan.

Output must contain:
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

    const raw = outputStep.content[0].type === 'text' ? outputStep.content[0].text : '{}';
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
