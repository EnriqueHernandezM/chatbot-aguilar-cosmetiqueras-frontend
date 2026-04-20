interface ConversationStateBadgeProps {
  isPotentialSale: boolean;
  isClosedSale: boolean;
  compact?: boolean;
}

export function ConversationStateBadge({ isPotentialSale, isClosedSale, compact = false }: ConversationStateBadgeProps) {
  if (!isPotentialSale && !isClosedSale) {
    return null;
  }

  return (
    <>
      {isPotentialSale && (
        <span className="inline-flex items-center rounded-full bg-status-waiting/15 text-status-waiting font-semibold">
          <span className={compact ? "h-2.5 w-2.5 rounded-full bg-status-waiting" : "px-2 py-0.5 text-[11px]"}>
            {!compact ? "Venta potencial" : null}
          </span>
        </span>
      )}
      {isClosedSale && (
        <span className="inline-flex items-center rounded-full bg-primary/15 text-primary font-semibold">
          <span className={compact ? "h-2.5 w-2.5 rounded-full bg-primary" : "px-2 py-0.5 text-[11px]"}>
            {!compact ? "Venta cerrada" : null}
          </span>
        </span>
      )}
    </>
  );
}
