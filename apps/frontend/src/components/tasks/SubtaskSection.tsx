'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Sparkles, Trash2, X } from 'lucide-react';
import type { Task } from '@/lib/types';
import { generateSubtasks } from '@/lib/api';
import { createSubtasksAction, deleteSubtaskAction } from '@/lib/actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

interface SubtaskSectionProps {
  task: Task;
}

interface SuggestedSubtask {
  id: string;
  title: string;
}

export const SubtaskSection = ({ task }: SubtaskSectionProps) => {
  const t = useTranslations('taskDetail.subtasks');
  const [suggestions, setSuggestions] = useState<SuggestedSubtask[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleDeleteSubtask = async (id: string) => {
    await deleteSubtaskAction(id, task.id);
  }

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { subtasks } = await generateSubtasks(task.id);
      setSuggestions(subtasks.map((title) => ({ id: crypto.randomUUID(), title })));
      setShowSuggestions(true);
    } finally {
      setIsGenerating(false);
    }
  }

  const handleApprove = async () => {
    const valid = suggestions.filter((s) => s.title.trim());
    await createSubtasksAction(valid.map((s) => ({ title: s.title.trim(), parentId: task.id })), task.id);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  const handleDiscard = () => {
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('sectionTitle')}</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || showSuggestions}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {isGenerating ? t('generating') : t('generateButton')}
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
                aria-label={t('deleteAriaLabel')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {task.subtasks.length === 0 && !showSuggestions && (
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      )}

      {showSuggestions && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">{t('reviewHint')}</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <Input
                    value={s.title}
                    onChange={(e) =>
                      setSuggestions((prev) =>
                        prev.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x))
                      )
                    }
                    className="h-9 text-sm"
                    aria-label={t('suggestionLabel', { index: i + 1 })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setSuggestions((prev) => prev.filter((x) => x.id !== s.id))}
                    aria-label={t('removeSuggestionLabel')}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
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
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {t('approve')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDiscard}>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                {t('discard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
