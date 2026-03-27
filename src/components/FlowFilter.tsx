import { cn } from '@/lib/utils';
import { ConversationState } from '@/modules/types';

export type FlowCategory = 'all' | 'menu' | 'models' | 'delivery' | 'location';

export const flowStateMapping: Record<FlowCategory, ConversationState[]> = {
  all: [],
  menu: ['MENU', 'POST_INFO_MENU'],
  models: ['SHOW_MODELS', 'SHOW_DYNAMICS'],
  delivery: ['SHOW_DELIVERY'],
  location: ['SHOW_LOCATION'],
};

interface FlowFilterProps {
  value: FlowCategory;
  onChange: (v: FlowCategory) => void;
  counts: Record<FlowCategory, number>;
}

const filters: { value: FlowCategory; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'menu', label: 'Menú' },
  { value: 'models', label: 'Modelos' },
  { value: 'delivery', label: 'Entregas' },
  { value: 'location', label: 'Ubicación' },
];

export function FlowFilter({ value, onChange, counts }: FlowFilterProps) {
  return (
    <div className="px-4 pb-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Flujo</p>
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
        {filters.map(f => {
          const count = counts[f.value];
          return (
            <button
              key={f.value}
              onClick={() => onChange(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[32px] flex items-center gap-1.5',
                value === f.value
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
              {f.value !== 'all' && (
                <span className={cn(
                  'text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1',
                  value === f.value ? 'bg-background/20' : 'bg-muted'
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
