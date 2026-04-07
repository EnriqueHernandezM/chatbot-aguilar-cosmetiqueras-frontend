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
  { value: 'potential_sale', label: 'Venta potencial' },
  { value: 'closed', label: 'Cerrado' },
  { value: 'sale_closed', label: 'Venta cerrada' },
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <div className="px-3 py-2 sm:px-4">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
      <div
        className="overflow-x-auto overflow-y-hidden hide-scrollbar touch-pan-x"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="inline-flex gap-1.5 pr-3 sm:pr-4">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onChange(filter.value)}
              className={cn(
                'min-h-[30px] shrink-0 rounded-full px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors sm:min-h-[32px] sm:px-3 sm:text-xs',
                value === filter.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
