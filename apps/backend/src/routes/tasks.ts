import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import db from '../db/index.js';
import { Task, TaskRow, TaskStatus, TaskPriority, SortBy } from '../types.js';

const router = Router();

const VALID_STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done'];
const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const VALID_SORT_BY: SortBy[] = ['priority', 'createdAt', 'updatedAt'];

const PRIORITY_ORDER = `CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`;
const SORT_EXPR: Record<SortBy, string> = {
  priority: PRIORITY_ORDER,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const rowToTask = (row: TaskRow, subtasks: Task[] = []): Task => {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subtasks,
  };
}

const fetchSubtasks = (parentId: string): Task[] => {
  const rows = db
    .prepare('SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at ASC')
    .all(parentId) as TaskRow[];
  return rows.map((r) => rowToTask(r));
}

// GET /api/tasks
router.get('/', (req: Request, res: Response) => {
  const {
    search,
    sortBy = 'createdAt',
    // userId accepted for future use but not applied
  } = req.query as Record<string, string>;

  const resolvedSortBy: SortBy = VALID_SORT_BY.includes(sortBy as SortBy)
    ? (sortBy as SortBy)
    : 'createdAt';

  const params: string[] = [];
  let where = 'WHERE parent_id IS NULL';

  if (search?.trim()) {
    where += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  const sql = `SELECT * FROM tasks ${where} ORDER BY ${SORT_EXPR[resolvedSortBy]}`;
  const rows = db.prepare(sql).all(...params) as TaskRow[];

  const tasks = rows.map((row) => rowToTask(row, fetchSubtasks(row.id)));
  res.json(tasks);
});

// GET /api/tasks/:id
router.get('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as
    | TaskRow
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.json(rowToTask(row, fetchSubtasks(row.id)));
});

// POST /api/tasks
router.post('/', (req: Request, res: Response) => {
  const {
    title,
    description = '',
    status = 'todo',
    priority = 'medium',
    parentId = null,
  } = req.body;

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (title.length > 255) {
    res.status(400).json({ error: 'title must be at most 255 characters' });
    return;
  }
  if (description !== '' && typeof description !== 'string') {
    res.status(400).json({ error: 'description must be a string' });
    return;
  }
  if (typeof description === 'string' && description.length > 5000) {
    res.status(400).json({ error: 'description must be at most 5000 characters' });
    return;
  }
  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }
  if (!VALID_PRIORITIES.includes(priority)) {
    res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
    return;
  }

  if (parentId !== null) {
    const parent = db.prepare('SELECT parent_id FROM tasks WHERE id = ?').get(parentId) as
      | Pick<TaskRow, 'parent_id'>
      | undefined;
    if (!parent) {
      res.status(404).json({ error: 'Parent task not found' });
      return;
    }
    if (parent.parent_id !== null) {
      res.status(400).json({ error: 'Subtasks cannot have their own subtasks' });
      return;
    }
  }

  const now = new Date().toISOString();
  const id = randomUUID();

  db.prepare(
    `
    INSERT INTO tasks (id, parent_id, title, description, status, priority, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `
  ).run(id, parentId, title.trim(), description, status, priority, now, now);

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;
  res.status(201).json(rowToTask(row));
});

// PATCH /api/tasks/:id
router.patch('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as
    | TaskRow
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const { title, description, status, priority } = req.body;

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }
  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    res.status(400).json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
    return;
  }
  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    res.status(400).json({ error: 'title cannot be empty' });
    return;
  }
  if (typeof title === 'string' && title.length > 255) {
    res.status(400).json({ error: 'title must be at most 255 characters' });
    return;
  }
  if (description !== undefined && typeof description !== 'string') {
    res.status(400).json({ error: 'description must be a string' });
    return;
  }
  if (typeof description === 'string' && description.length > 5000) {
    res.status(400).json({ error: 'description must be at most 5000 characters' });
    return;
  }

  const updated: Partial<TaskRow> = {
    title: title !== undefined ? title.trim() : row.title,
    description: description !== undefined ? description : row.description,
    status: status !== undefined ? status : row.status,
    priority: priority !== undefined ? priority : row.priority,
    updated_at: new Date().toISOString(),
  };

  db.prepare(
    `
    UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, updated_at = ?
    WHERE id = ?
  `
  ).run(
    updated.title,
    updated.description,
    updated.status,
    updated.priority,
    updated.updated_at,
    row.id
  );

  const updatedRow = db.prepare('SELECT * FROM tasks WHERE id = ?').get(row.id) as TaskRow;
  res.json(rowToTask(updatedRow, fetchSubtasks(updatedRow.id)));
});

// DELETE /api/tasks/:id
router.delete('/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

export default router;
