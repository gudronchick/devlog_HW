'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Save, Sparkles, Trash2 } from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';
import { deleteTask, updateTask } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SubtaskSection } from './subtask-section';
import { cn } from '@/lib/utils';

interface TaskDetailClientProps {
  task: Task;
}

export function TaskDetailClient({ task }: TaskDetailClientProps) {
  const router = useRouter();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [savedSnapshot, setSavedSnapshot] = useState({
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
  });
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDirty =
    title !== savedSnapshot.title ||
    description !== savedSnapshot.description ||
    status !== savedSnapshot.status ||
    priority !== savedSnapshot.priority;

  async function handleSave() {
    setIsSaving(true);
    try {
      await updateTask(task.id, { title: title.trim(), description, status, priority });
      setSavedSnapshot({ title: title.trim(), description, status, priority });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      router.push('/');
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tasks
      </Link>

      {/* Title */}
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          {editingTitle ? (
            <Input
              ref={titleInputRef}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false);
              }}
              className="text-xl font-semibold h-auto py-1.5"
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              className={cn(
                'group/title flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 -mx-2 hover:bg-muted transition-colors',
                isDirty && title !== savedSnapshot.title && 'text-foreground'
              )}
              onClick={() => {
                setEditingTitle(true);
                setTimeout(() => titleInputRef.current?.focus(), 0);
              }}
              onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(true)}
            >
              <h1 className="text-xl font-semibold flex-1">{title}</h1>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
            </div>
          )}
          <p className="text-xs text-muted-foreground px-2">
            Created {new Date(task.createdAt).toLocaleDateString()} · Updated{' '}
            {new Date(task.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive shrink-0 mt-1"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Status + Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>Description</Label>
        {editingDesc ? (
          <Textarea
            ref={descInputRef}
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => setEditingDesc(false)}
            placeholder="Add a description…"
            rows={4}
          />
        ) : (
          <div
            role="button"
            tabIndex={0}
            className="group/desc flex items-start gap-2 cursor-pointer rounded-md px-3 py-2.5 border border-transparent hover:border-input hover:bg-muted/40 transition-colors min-h-[80px]"
            onClick={() => {
              setEditingDesc(true);
              setTimeout(() => descInputRef.current?.focus(), 0);
            }}
            onKeyDown={(e) => e.key === 'Enter' && setEditingDesc(true)}
          >
            <p className="text-sm flex-1 whitespace-pre-wrap">
              {description || (
                <span className="text-muted-foreground italic">Add a description…</span>
              )}
            </p>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/desc:opacity-100 transition-opacity shrink-0 mt-0.5" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={!isDirty || isSaving || !title.trim()}>
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="outline" disabled>
          <Sparkles className="h-4 w-4" />
          Generate update
        </Button>
      </div>

      <Separator />

      <SubtaskSection task={task} />
    </div>
  );
}
