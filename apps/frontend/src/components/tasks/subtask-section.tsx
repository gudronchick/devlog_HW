'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Sparkles, Trash2, X } from 'lucide-react';
import type { Task } from '@/lib/types';
import { createTask, deleteTask } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface SubtaskSectionProps {
  task: Task;
}

interface SuggestedSubtask {
  id: string;
  title: string;
}

export function SubtaskSection({ task }: SubtaskSectionProps) {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<SuggestedSubtask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  async function handleDeleteSubtask(id: string) {
    await deleteTask(id);
    router.refresh();
  }

  function handleGenerate() {
    // Placeholder — real AI call wired in next stage
    setIsGenerating(true);
    setTimeout(() => {
      setSuggestions([
        { id: crypto.randomUUID(), title: 'Subtask placeholder 1' },
        { id: crypto.randomUUID(), title: 'Subtask placeholder 2' },
        { id: crypto.randomUUID(), title: 'Subtask placeholder 3' },
      ]);
      setShowSuggestions(true);
      setIsGenerating(false);
    }, 600);
  }

  async function handleApprove() {
    const valid = suggestions.filter((s) => s.title.trim());
    await Promise.all(valid.map((s) => createTask({ title: s.title.trim(), parentId: task.id })));
    setSuggestions([]);
    setShowSuggestions(false);
    router.refresh();
  }

  function handleDiscard() {
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Subtasks</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || showSuggestions}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isGenerating ? 'Generating…' : 'Generate subtasks'}
        </Button>
      </div>

      {task.subtasks.length > 0 && (
        <div className="space-y-1.5">
          {task.subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2 group">
              <div className="flex-1 text-sm py-2 px-3 rounded-md bg-muted">{subtask.title}</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteSubtask(subtask.id)}
                aria-label="Remove subtask"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {task.subtasks.length === 0 && !showSuggestions && (
        <p className="text-sm text-muted-foreground">No subtasks yet.</p>
      )}

      {showSuggestions && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Review and edit before saving:</p>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <Input
                    value={s.title}
                    onChange={(e) =>
                      setSuggestions((prev) =>
                        prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x))
                      )
                    }
                    className="h-9 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setSuggestions((prev) => prev.filter((x) => x.id !== s.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={suggestions.every((s) => !s.title.trim())}
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={handleDiscard}>
                <X className="h-3.5 w-3.5" />
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
