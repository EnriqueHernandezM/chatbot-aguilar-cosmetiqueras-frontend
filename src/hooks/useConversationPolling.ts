import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
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

function getConversationMessageKey(conversation: Conversation) {
  return conversation.lastMessageId ?? conversation.lastMessageAt ?? conversation.updatedAt;
}

export function useConversationPolling({
  enabled,
  statusFilter,
  conversations,
  setConversations,
}: UseConversationPollingOptions) {
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
      nextMap[conversation.id] = getConversationMessageKey(conversation);
    }

    lastMessageMapRef.current = nextMap;
  }, [conversations]);

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
        setConversations((previous) => {
          const previousMap = new Map(previous.map((conversation) => [conversation.id, conversation]));
          const nextPinnedToTop: Conversation[] = [];
          const nextInPlace = new Map<string, Conversation>();
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

            if (!shouldKeepConversation(nextConversation, activeStatusFilter)) {
              delete nextMessageMap[nextConversation.id];
              continue;
            }

            const previousMessageKey = nextMessageMap[nextConversation.id];
            const nextMessageKey = getConversationMessageKey(nextConversation);
            const shouldMoveToTop = previousConversation ? previousMessageKey !== nextMessageKey : true;

            nextMessageMap[nextConversation.id] = nextMessageKey;

            if (shouldMoveToTop) {
              nextPinnedToTop.push(nextConversation);
            } else {
              nextInPlace.set(nextConversation.id, nextConversation);
            }
          }

          lastMessageMapRef.current = nextMessageMap;

          const remaining = previous
            .filter((conversation) => shouldKeepConversation(conversation, activeStatusFilter))
            .map((conversation) => nextInPlace.get(conversation.id) ?? conversation)
            .filter((conversation) => !nextPinnedToTop.some((item) => item.id === conversation.id));

          const newInPlace = dedupedUpdates
            .map((conversation) => conversation.id)
            .filter((id) => !previousMap.has(id))
            .map((id) => nextInPlace.get(id))
            .filter((conversation): conversation is Conversation => !!conversation);

          return [...nextPinnedToTop, ...remaining, ...newInPlace];
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
  }, [enabled, setConversations]);
}
