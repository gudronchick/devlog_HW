import { Layers } from 'lucide-react';

export function Header() {
  return (
    <header className="h-14 shrink-0 border-b flex items-center px-6 bg-background">
      <Layers className="h-5 w-5 text-primary mr-2" />
      <span className="font-semibold text-lg">DevLog</span>
      <span className="ml-3 text-sm text-muted-foreground hidden sm:block">
        Task tracker for engineering teams
      </span>
    </header>
  );
}
