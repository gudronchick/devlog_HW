'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { analyseDay, type AnalyseDayResult } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface AnalyseDayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalyseDayModal({ open, onOpenChange }: AnalyseDayModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalyseDayResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setError('');
    setIsLoading(true);
    analyseDay()
      .then(setResult)
      .catch(() => setError('Failed to analyse tasks. Please try again.'))
      .finally(() => setIsLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {result ? result.title : 'Analysing your day…'}
          </DialogTitle>
          {result && (
            <DialogDescription>{result.description}</DialogDescription>
          )}
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Thinking…
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && result.tasks.length > 0 && (
          <ul className="space-y-2">
            {result.tasks.map((task, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{task}</span>
              </li>
            ))}
          </ul>
        )}

        {result && result.tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks to focus on right now.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
