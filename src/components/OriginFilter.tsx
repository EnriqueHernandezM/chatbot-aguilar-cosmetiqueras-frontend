import { cn } from '@/lib/utils';

export type OriginCategory = 'all' | 'monterrey' | 'nacional';

interface OriginFilterProps {
  value: OriginCategory;
  onChange: (v: OriginCategory) => void;
}

const filters: { value: OriginCategory; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'monterrey', label: 'Monterrey' },
  { value: 'nacional', label: 'Nacional' },
];

export function OriginFilter({ value, onChange }: OriginFilterProps) {
  return (
    <div className="px-4 pb-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Origen</p>
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[32px]',
              value === f.value
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
