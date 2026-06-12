'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Sparkles, X } from 'lucide-react';
import { analyseDay, type AnalyseDayResult } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export const AnalysisPromptBanner = () => {
  const t = useTranslations('analyseDay');
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalyseDayResult | null>(null);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  if (dismissed) {
    return null;
  }

  const handleAnalyse = async () => {
    setIsLoading(true);
    setError('');
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const data = await analyseDay(controller.signal);
      setResult(data);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(t('errorMessage'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mx-6 mt-4 border-dashed">
      <CardContent className="p-4">
        {!result && !isLoading && !error && (
          <div className="flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
            <p className="text-sm text-muted-foreground flex-1">{t('banner.prompt')}</p>
            <Button variant="outline" size="sm" onClick={handleAnalyse}>
              {t('banner.cta')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setDismissed(true)}
              aria-label={t('banner.dismiss')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Sparkles className="h-4 w-4 animate-pulse" aria-hidden="true" />
            {t('thinking')}
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between gap-3">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground shrink-0"
              onClick={() => setDismissed(true)}
              aria-label={t('banner.dismiss')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{result.title}</p>
                {result.description && (
                  <p className="text-xs text-muted-foreground">{result.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground shrink-0"
                onClick={() => setDismissed(true)}
                aria-label={t('banner.dismiss')}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            {result.tasks.length > 0 ? (
              <ul className="space-y-1.5">
                {result.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2
                      className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noTasks')}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
