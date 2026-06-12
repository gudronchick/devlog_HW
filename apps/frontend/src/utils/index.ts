const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

const UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: 'year', ms: 31_536_000_000 },
  { unit: 'month', ms: 2_592_000_000 },
  { unit: 'week', ms: 604_800_000 },
  { unit: 'day', ms: 86_400_000 },
  { unit: 'hour', ms: 3_600_000 },
  { unit: 'minute', ms: 60_000 },
  { unit: 'second', ms: 1_000 },
];

export const getRelativeTime = (dateStr: string): string => {
  const diff = new Date(dateStr).getTime() - Date.now();
  const abs = Math.abs(diff);
  const { unit, ms } = UNITS.find(({ ms }) => abs >= ms) ?? UNITS[UNITS.length - 1];
  return rtf.format(Math.round(diff / ms), unit);
};
