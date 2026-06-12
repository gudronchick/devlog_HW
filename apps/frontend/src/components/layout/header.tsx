import { getTranslations } from 'next-intl/server';
import { Layers } from 'lucide-react';

export async function Header() {
  const t = await getTranslations('layout.header');

  return (
    <header className="h-14 shrink-0 border-b flex items-center px-6 bg-background">
      <Layers className="h-5 w-5 text-primary mr-2" />
      <span className="font-semibold text-lg">{t('brand')}</span>
      <span className="ml-3 text-sm text-muted-foreground hidden sm:block">{t('tagline')}</span>
    </header>
  );
}
