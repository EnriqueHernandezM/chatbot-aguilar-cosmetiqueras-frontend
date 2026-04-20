import { ConversationStatus } from "@/modules/types";
import { cn } from "@/lib/utils";

const statusConfig: Record<ConversationStatus, { label: string; shortLabel: string; className: string }> = {
  active: { label: "Activo", shortLabel: "Activo", className: "bg-status-active/15 text-status-active" },
  waiting_human: { label: "En espera", shortLabel: "Espera", className: "bg-status-waiting/15 text-status-waiting" },
  closed: { label: "Cerrado", shortLabel: "Cerrado", className: "bg-status-closed/15 text-status-closed" },
};

interface StatusBadgeProps {
  status: ConversationStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (compact) {
    return (
      <span
        className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", {
          "bg-status-active": status === "active",
          "bg-status-waiting": status === "waiting_human",
          "bg-status-closed": status === "closed",
        })}
        title={config.label}
      />
    );
  }

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.className)}>
      <span
        className={cn("w-1.5 h-1.5 rounded-full mr-1.5", {
          "bg-status-active": status === "active",
          "bg-status-waiting": status === "waiting_human",
          "bg-status-closed": status === "closed",
        })}
      />
      {config.label}
    </span>
  );
}
