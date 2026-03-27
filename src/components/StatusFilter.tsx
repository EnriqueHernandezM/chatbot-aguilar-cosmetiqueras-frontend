import { cn } from '@/lib/utils';

export type InboxFilter = 'all' | 'active' | 'waiting_human' | 'closed' | 'potential_sale' | 'sale_closed';

interface StatusFilterProps {
  value: InboxFilter;
  onChange: (v: InboxFilter) => void;
}

const filters: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activo' },
  { value: 'waiting_human', label: 'En espera' },
  { value: 'potential_sale', label: 'Venta potencial 🔥' },
  { value: 'closed', label: 'Cerrado' },
  { value: 'sale_closed', label: 'Venta cerrada 💰' },
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="px-4 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Estado</p>
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[32px]',
              value === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
