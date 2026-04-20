import { X, Zap } from "lucide-react";
import { useQuickReplyTemplates } from "@/hooks/useQuickReplyTemplates";
import { QuickReplyTemplate } from "@/modules/types";

interface QuickReplySheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (content: string) => void;
}

export function QuickReplySheet({ open, onClose, onSelect }: QuickReplySheetProps) {
  const { templates, loading } = useQuickReplyTemplates();

  if (!open) {
    return null;
  }

  const grouped = templates.reduce<Record<string, QuickReplyTemplate[]>>((acc, template) => {
    const category = template.category || "Otro";
    (acc[category] ||= []).push(template);
    return acc;
  }, {});

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/40 animate-fade-in" onClick={onClose} />

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-lg animate-slide-up">
        <div className="flex shrink-0 flex-col items-center border-b border-border px-4 pb-2 pt-3">
          <div className="mb-3 h-1 w-10 rounded-full bg-muted" />
          <div className="flex w-full items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Zap className="h-4 w-4 text-primary" />
              Respuestas rapidas
            </h3>
            <button
              onClick={onClose}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full p-2 hover:bg-secondary"
              type="button"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No hay respuestas rapidas disponibles.</p>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="mb-4 last:mb-0">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {category}
                </span>
                <div className="space-y-1.5">
                  {items.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        onSelect(template.content);
                        onClose();
                      }}
                      className="w-full rounded-xl bg-secondary px-3.5 py-3 text-left transition-colors hover:bg-accent active:bg-accent"
                      type="button"
                    >
                      <span className="block text-sm font-medium text-foreground">{template.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
                        {template.content}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
