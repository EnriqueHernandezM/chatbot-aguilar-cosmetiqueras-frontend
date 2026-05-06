import { Conversation } from "@/modules/types";
import { StatusBadge } from "./StatusBadge";
import { ConversationStateBadge } from "./ConversationStateBadge";
import { isToday, isYesterday, format } from "date-fns";
import { cn } from "@/lib/utils";

interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
  isActive?: boolean;
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Yesterday";
  return format(date, "dd/MM/yy");
}

export function ConversationItem({ conversation, onClick, isActive }: ConversationItemProps) {
  const time = formatMessageTime(conversation.lastMessageAt);
  const hasUnread = conversation.unreadCount > 0;
  const displayName = conversation.leadName || conversation.leadPhone;
  const isBotHandlingConversation = conversation.status === "active";
  const hasRecentUpdate = conversation.hasRecentUpdate === true;
  const assignedAgentName = conversation.assignedTo?.name?.trim();

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left border-b border-border active:bg-accent relative",
        isBotHandlingConversation && "bg-muted/45",
        hasRecentUpdate && "bg-primary/5",
        isActive ? "bg-accent" : "hover:bg-conversation-hover",
      )}
    >
      {isBotHandlingConversation && <div className="absolute inset-0 bg-foreground/5 pointer-events-none" />}

      {/* Avatar */}
      <div className={cn("flex-shrink-0 w-[52px] h-[52px] rounded-full flex items-center justify-center relative z-10", hasUnread ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        <span className="font-semibold text-lg">{displayName.charAt(0).toUpperCase()}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 relative z-10">
        {/* Row 1: Name + Time */}
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="min-w-0">
            <span className={cn("block text-[15px] truncate", hasUnread ? "font-bold text-foreground" : "font-medium text-foreground")}>{displayName}</span>
            {assignedAgentName && <span className="block text-[11px] text-muted-foreground truncate">Asignado a: {assignedAgentName}</span>}
          </div>
          <span className={cn("text-xs flex-shrink-0 ml-2", hasUnread ? "text-primary font-semibold" : "text-muted-foreground")}>{time}</span>
        </div>

        {/* Row 2: Message preview + badge/status */}
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm truncate flex-1", hasUnread ? "text-foreground font-medium" : "text-muted-foreground")}>{conversation.lastMessage}</p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ConversationStateBadge isPotentialSale={conversation.isPotentialSale} isClosedSale={conversation.isClosedSale} />
            <StatusBadge status={conversation.status} compact />
            {hasUnread && <span className="min-w-[22px] h-[22px] rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center px-1.5">{conversation.unreadCount}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}
