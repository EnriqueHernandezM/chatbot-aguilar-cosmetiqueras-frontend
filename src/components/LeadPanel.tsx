import { useEffect, useState } from "react";
import { Lead } from "@/modules/types";
import { User, Phone, Mail, Building, FileText, X, Check } from "lucide-react";

interface LeadPanelProps {
  lead: Lead | undefined;
  onClose: () => void;
  // Opcional: si no se pasa, el campo de alias no se muestra (compatibilidad con usos actuales de LeadPanel).
  onSaveNickname?: (nickname: string | null) => Promise<void>;
}

export function LeadPanel({ lead, onClose, onSaveNickname }: LeadPanelProps) {
  const [nicknameInput, setNicknameInput] = useState(lead?.nickname ?? "");
  const [isSaving, setIsSaving] = useState(false);

  // Si cambia el lead (o llega su nickname actualizado tras guardar), resincroniza el input.
  useEffect(() => {
    setNicknameInput(lead?.nickname ?? "");
  }, [lead?.id, lead?.nickname]);

  if (!lead) return null;

  const displayName = lead.nickname?.trim() ? lead.nickname.trim() : lead.phone;
  const trimmedInput = nicknameInput.trim();
  const hasChanges = trimmedInput !== (lead.nickname ?? "").trim();

  const handleSave = async () => {
    if (!onSaveNickname || isSaving || !hasChanges) {
      return;
    }

    setIsSaving(true);

    try {
      await onSaveNickname(trimmedInput ? trimmedInput : null);
    } catch {
      // El toast de error ya se maneja arriba; dejamos el input tal como esta para reintentar.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-foreground/40 animate-fade-in" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card shadow-xl animate-slide-up overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Info del contacto</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">{displayName}</h3>
          </div>

          {onSaveNickname && (
            <div className="space-y-2 p-3 rounded-lg bg-secondary">
              <span className="text-xs text-muted-foreground block">Alias</span>
              <div className="flex items-center gap-2">
                <input
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  placeholder="Agregar un alias..."
                  disabled={isSaving}
                  className="flex-1 rounded-lg bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                />
                <button
                  onClick={() => void handleSave()}
                  disabled={!hasChanges || isSaving}
                  className="p-2 rounded-full bg-primary text-primary-foreground disabled:opacity-40 min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0"
                  type="button"
                  title="Guardar alias"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <InfoRow icon={Phone} label="Teléfono" value={lead.phone} />
            {lead.email && <InfoRow icon={Mail} label="Correo" value={lead.email} />}
            {lead.company && <InfoRow icon={Building} label="Empresa" value={lead.company} />}
            {lead.notes && <InfoRow icon={FileText} label="Notas" value={lead.notes} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary">
      <Icon className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-xs text-muted-foreground block">{label}</span>
        <span className="text-sm text-foreground font-medium">{value}</span>
      </div>
    </div>
  );
}
