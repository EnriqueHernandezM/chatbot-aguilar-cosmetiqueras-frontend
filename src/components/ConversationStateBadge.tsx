interface ConversationStateBadgeProps {
  isPotentialSale: boolean;
  isClosedSale: boolean;
}

export function ConversationStateBadge({ isPotentialSale, isClosedSale }: ConversationStateBadgeProps) {
  if (!isPotentialSale && !isClosedSale) {
    return null;
  }

  return (
    <>
      {isPotentialSale && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-status-waiting/15 text-status-waiting">
          Venta potencial
        </span>
      )}
      {isClosedSale && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/15 text-primary">
          Venta cerrada
        </span>
      )}
    </>
  );
}
