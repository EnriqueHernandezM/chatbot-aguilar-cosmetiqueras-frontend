import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { useLocation } from "react-router-dom";
import { getConversationUpdates, getConversations } from "@/api/conversationsApi";
import { Conversation, ConversationStatus, MessageSender } from "@/modules/types";

const POLLING_INTERVAL_MS = 20000;
const HIGHLIGHT_DURATION_MS = 3000;

interface UseConversationPollingOptions {
  enabled: boolean;
  statusFilter?: ConversationStatus;
  conversations: Conversation[];
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  currentUserId?: string;
}

function normalizeSender(sender?: string): MessageSender | undefined {
  if (sender === "agent" || sender === "bot" || sender === "user") {
    return sender;
  }

  if (sender === "customer" || sender === "client" || sender === "lead") {
    return "user";
  }

  return undefined;
}

function shouldKeepConversation(conversation: Conversation, statusFilter?: ConversationStatus) {
  return !statusFilter || conversation.status === statusFilter;
}

function isSparseConversationUpdate(conversation: Conversation) {
  return !conversation.lastMessageId && conversation.lastMessage === "Sin mensajes";
}

export function useConversationPolling({
  enabled,
  statusFilter,
  conversations,
  setConversations,
  currentUserId,
}: UseConversationPollingOptions) {
  const location = useLocation();
  const intervalRef = useRef<number | null>(null);
  const lastCheckRef = useRef<string>(new Date().toISOString());
  const lastMessageMapRef = useRef<Record<string, string | undefined>>({});
  const statusFilterRef = useRef(statusFilter);
  const highlightTimeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    statusFilterRef.current = statusFilter;
  }, [statusFilter]);

  useEffect(() => {
    const nextMap: Record<string, string | undefined> = {};

    for (const conversation of conversations) {
      nextMap[conversation.id] = conversation.lastMessageId ?? conversation.updatedAt;
    }

    lastMessageMapRef.current = nextMap;
  }, [conversations]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    if (window.Notification.permission === "default") {
      void window.Notification.requestPermission();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      return;
    }

    let isDisposed = false;
    let isPolling = false;

    const runPolling = async () => {
      if (isDisposed || isPolling) {
        return;
      }

      isPolling = true;

      try {
        const startedAt = new Date().toISOString();
        const rawUpdates = await getConversationUpdates(lastCheckRef.current);

        if (!rawUpdates.length) {
          lastCheckRef.current = startedAt;
          return;
        }

        let updates = rawUpdates;
        const needsHydration = rawUpdates.some(isSparseConversationUpdate);

        if (needsHydration) {
          const allConversations = await getConversations();
          const updateIds = new Set(rawUpdates.map((conversation) => conversation.id));
          const hydratedUpdates = allConversations.filter((conversation) => updateIds.has(conversation.id));

          if (hydratedUpdates.length > 0) {
            updates = hydratedUpdates;
          }
        }

        const dedupedUpdates = Array.from(new Map(updates.map((conversation) => [conversation.id, conversation])).values());
        const currentConversationId = location.pathname.startsWith("/conversations/") ? location.pathname.split("/")[2] : undefined;
        const notifications: string[] = [];

        setConversations((previous) => {
          const previousMap = new Map(previous.map((conversation) => [conversation.id, conversation]));
          const updatedIds = new Set<string>();
          const nextUpdated: Conversation[] = [];
          const nextMessageMap = { ...lastMessageMapRef.current };
          const activeStatusFilter = statusFilterRef.current;

          for (const incomingConversation of dedupedUpdates) {
            const previousConversation = previousMap.get(incomingConversation.id);
            const normalizedSender = normalizeSender(incomingConversation.lastMessageSender);
            const nextConversation: Conversation = {
              ...previousConversation,
              ...incomingConversation,
              lastMessageSender: normalizedSender ?? previousConversation?.lastMessageSender,
              unreadCount:
                typeof incomingConversation.unreadCount === "number"
                  ? incomingConversation.unreadCount
                  : previousConversation?.unreadCount ?? 0,
              hasRecentUpdate: true,
            };

            updatedIds.add(nextConversation.id);

            if (!shouldKeepConversation(nextConversation, activeStatusFilter)) {
              delete nextMessageMap[nextConversation.id];
              continue;
            }

            const previousLastMessageId = nextMessageMap[nextConversation.id];
            const lastMessageChanged =
              (typeof nextConversation.lastMessageId === "string" || typeof nextConversation.updatedAt === "string") &&
              previousLastMessageId !== (nextConversation.lastMessageId ?? nextConversation.updatedAt);

            nextMessageMap[nextConversation.id] = nextConversation.lastMessageId ?? nextConversation.updatedAt;
            nextUpdated.push(nextConversation);

            const isAssignedToCurrentUser =
              !!nextConversation.assignedTo?.id && !!currentUserId && nextConversation.assignedTo.id === currentUserId;
            const isUnassignedConversation = !nextConversation.assignedTo?.id;
            const shouldNotifyCurrentUser = isUnassignedConversation || isAssignedToCurrentUser;
            const notificationBody =
              typeof nextConversation.lastMessage === "string" && nextConversation.lastMessage.trim() && nextConversation.lastMessage !== "Sin mensajes"
                ? nextConversation.lastMessage
                : isUnassignedConversation
                  ? `Nueva conversacion de ${nextConversation.leadName || nextConversation.leadPhone || "un cliente"}`
                  : `Actividad nueva en la conversacion de ${nextConversation.leadName || nextConversation.leadPhone || "un cliente"}`;

            if (
              lastMessageChanged &&
              shouldNotifyCurrentUser &&
              currentConversationId !== nextConversation.id
            ) {
              notifications.push(notificationBody);
            }
          }

          lastMessageMapRef.current = nextMessageMap;

          const remaining = previous.filter(
            (conversation) => !updatedIds.has(conversation.id) && shouldKeepConversation(conversation, activeStatusFilter),
          );

          return [...nextUpdated, ...remaining];
        });

        for (const conversation of dedupedUpdates) {
          const conversationId = conversation.id;

          if (highlightTimeoutsRef.current[conversationId]) {
            window.clearTimeout(highlightTimeoutsRef.current[conversationId]);
          }

          highlightTimeoutsRef.current[conversationId] = window.setTimeout(() => {
            setConversations((previous) =>
              previous.map((item) =>
                item.id === conversationId ? { ...item, hasRecentUpdate: false } : item,
              ),
            );

            delete highlightTimeoutsRef.current[conversationId];
          }, HIGHLIGHT_DURATION_MS);
        }

        if (typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted") {
          for (const body of notifications) {
            new window.Notification("Nuevo mensaje", { body });
          }
        }

        lastCheckRef.current = startedAt;
      } catch {
        lastCheckRef.current = new Date().toISOString();
      } finally {
        isPolling = false;
      }
    };

    void runPolling();
    intervalRef.current = window.setInterval(() => {
      void runPolling();
    }, POLLING_INTERVAL_MS);

    return () => {
      isDisposed = true;

      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      for (const timeoutId of Object.values(highlightTimeoutsRef.current)) {
        window.clearTimeout(timeoutId);
      }

      highlightTimeoutsRef.current = {};
    };
  }, [currentUserId, enabled, location.pathname, setConversations]);
}
