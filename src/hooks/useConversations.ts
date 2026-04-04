import { useCallback, useEffect, useMemo, useState } from "react";
import { Conversation, ConversationStatus, Lead, Message } from "@/modules/types";
import { InboxFilter } from "@/components/StatusFilter";
import { FlowCategory, flowStateMapping } from "@/components/FlowFilter";
import { OriginCategory } from "@/components/OriginFilter";
import {
  assignConversation as apiAssignConversation,
  closeConversation as apiCloseConversation,
  deleteConversation as apiDeleteConversation,
  getConversations,
  markConversationRead,
  takeConversation as apiTakeConversation,
  updateConversationStatus as apiUpdateConversationStatus,
} from "@/api/conversationsApi";
import { getConversationMessages, sendConversationMessage } from "@/api/messagesApi";
import { uploadImagesToS3 } from "@/services/s3Upload";
import { toast } from "sonner";
import { useAuth } from "@/modules/auth/useAuth";
import { useConversationPolling } from "@/hooks/useConversationPolling";

function getStoredOrigin(): OriginCategory {
  try {
    const value = localStorage.getItem("originFilter");
    if (value === "monterrey" || value === "nacional") {
      return value;
    }
  } catch {
    return "all";
  }

  return "all";
}

function getBackendStatusFilter(statusFilter: InboxFilter): ConversationStatus | undefined {
  if (statusFilter === "active" || statusFilter === "waiting_human" || statusFilter === "closed") {
    return statusFilter;
  }

  return undefined;
}

export function useConversations(options?: { enablePolling?: boolean }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InboxFilter>("all");
  const [flowFilter, setFlowFilter] = useState<FlowCategory>("all");
  const [originFilter, setOriginFilterState] = useState<OriginCategory>(getStoredOrigin);
  const backendStatusFilter = getBackendStatusFilter(statusFilter);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await getConversations({ status: backendStatusFilter });
      setConversations(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar las conversaciones";
      toast.error(message);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [backendStatusFilter]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (statusFilter !== "active" && flowFilter !== "all") {
      setFlowFilter("all");
    }
  }, [flowFilter, statusFilter]);

  useConversationPolling({
    enabled: options?.enablePolling === true && !isLoading,
    statusFilter: backendStatusFilter,
    conversations,
    setConversations,
    currentUserId: user?.id,
  });

  const setOriginFilter = useCallback((value: OriginCategory) => {
    setOriginFilterState(value);

    try {
      localStorage.setItem("originFilter", value);
    } catch {
      // Ignore localStorage failures and keep UI state in memory.
    }
  }, []);

  const flowCounts = useMemo(() => {
    const counts: Record<FlowCategory, number> = { all: 0, menu: 0, models: 0, delivery: 0, location: 0 };

    for (const conversation of conversations) {
      for (const [category, states] of Object.entries(flowStateMapping)) {
        if (category !== "all" && states.includes(conversation.currentState)) {
          counts[category as FlowCategory] += 1;
        }
      }
    }

    counts.all = counts.menu + counts.models + counts.delivery + counts.location;
    return counts;
  }, [conversations]);

  const filtered = useMemo(() => {
    let list = conversations;

    switch (statusFilter) {
      case "potential_sale":
        list = list.filter((conversation) => conversation.isPotentialSale);
        break;
      case "sale_closed":
        list = list.filter((conversation) => conversation.isClosedSale);
        break;
    }

    if (statusFilter === "active" && flowFilter !== "all") {
      const states = flowStateMapping[flowFilter];
      list = list.filter((conversation) => states.includes(conversation.currentState));
    }

    if (originFilter !== "all") {
      list = list.filter((conversation) => conversation.origin === originFilter);
    }

    return [...list].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, [conversations, statusFilter, flowFilter, originFilter]);

  const assignConversation = useCallback(async (id: string, agentId: string) => {
    const previousConversations = conversations;

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              assignedTo: {
                id: agentId,
                name: "Asignado",
                email: "",
                role: "",
                active: true,
              },
              status: "active" as ConversationStatus,
            }
          : conversation,
      ),
    );

    try {
      await apiAssignConversation(id);
      toast.success("Conversacion asignada");
    } catch (error) {
      setConversations(previousConversations);
      const message = error instanceof Error ? error.message : "No se pudo asignar la conversacion";
      toast.error(message);
    }
  }, [conversations]);

  const updateStatus = useCallback(async (id: string, status: ConversationStatus) => {
    const previousConversations = conversations;

    setConversations((prev) =>
      prev.map((conversation) => (conversation.id === id ? { ...conversation, status } : conversation)),
    );

    try {
      await apiUpdateConversationStatus(id, status);
      toast.success("Estado actualizado");
    } catch (error) {
      setConversations(previousConversations);
      const message = error instanceof Error ? error.message : "No se pudo actualizar el estado";
      toast.error(message);
    }
  }, [conversations]);

  const takeConversation = useCallback(async (id: string) => {
    const previousConversations = conversations;

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              status: "waiting_human" as ConversationStatus,
              assignedTo: user
                ? {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role ?? "",
                    active: true,
                  }
                : conversation.assignedTo,
            }
          : conversation,
      ),
    );

    try {
      await apiTakeConversation(id);
      toast.success("Conversacion tomada");
    } catch (error) {
      setConversations(previousConversations);
      const message = error instanceof Error ? error.message : "No se pudo tomar la conversacion";
      toast.error(message);
      throw error;
    }
  }, [conversations, user]);

  const markRead = useCallback(async (id: string) => {
    const previousConversations = conversations;

    setConversations((prev) =>
      prev.map((conversation) => (conversation.id === id ? { ...conversation, unreadCount: 0 } : conversation)),
    );

    try {
      await markConversationRead(id);
    } catch (error) {
      setConversations(previousConversations);
      const message = error instanceof Error ? error.message : "No se pudo marcar la conversacion como leida";
      toast.error(message);
    }
  }, [conversations]);

  const closeConversation = useCallback(async (id: string) => {
    const previousConversations = conversations;

    setConversations((prev) =>
      prev.map((conversation) => (conversation.id === id ? { ...conversation, status: "closed" as ConversationStatus } : conversation)),
    );

    try {
      await apiCloseConversation(id);
      toast.success("Conversacion cerrada");
    } catch (error) {
      setConversations(previousConversations);
      const message = error instanceof Error ? error.message : "Error al cerrar la conversacion";
      toast.error(message);
      throw error;
    }
  }, [conversations]);

  const removeConversation = useCallback(async (id: string) => {
    const previousConversations = conversations;

    setConversations((prev) => prev.filter((conversation) => conversation.id !== id));

    try {
      await apiDeleteConversation(id);
      toast.success("Conversacion eliminada");
    } catch (error) {
      setConversations(previousConversations);
      const message = error instanceof Error ? error.message : "Error al eliminar la conversacion";
      toast.error(message);
      throw error;
    }
  }, [conversations]);

  const updateConversationSale = useCallback(async (id: string, saleType: "potential" | "closed") => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? {
              ...conversation,
              isPotentialSale: saleType === "potential" ? true : conversation.isPotentialSale,
              isClosedSale: saleType === "closed" ? true : conversation.isClosedSale,
            }
          : conversation,
      ),
    );

    toast.success(saleType === "potential" ? "Marcada como venta potencial" : "Marcada como venta cerrada");
  }, []);

  return {
    conversations: filtered,
    allConversations: conversations,
    isLoading,
    reloadConversations: loadConversations,
    statusFilter,
    setStatusFilter,
    flowFilter,
    setFlowFilter,
    flowCounts,
    originFilter,
    setOriginFilter,
    assignConversation,
    takeConversation,
    updateStatus,
    markRead,
    closeConversation,
    removeConversation,
    updateConversationSale,
  };
}

export function useMessages(conversationId: string, conversation?: Conversation) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;

    const loadMessages = async () => {
      setIsLoading(true);

      try {
        const data = await getConversationMessages(conversationId, conversation);

        if (isMounted) {
          setMessages(data);
        }
      } catch (error) {
        if (isMounted) {
          setMessages([]);
          const message = error instanceof Error ? error.message : "No se pudieron cargar los mensajes";
          toast.error(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [conversationId, conversation]);

  const sendMessage = async (content: string, type: "text" | "image" | "note" = "text", files?: File[]) => {
    const now = new Date().toISOString();
    const previewUrls = type === "image" && files?.length ? files.map((file) => URL.createObjectURL(file)) : undefined;
    const optimisticMessage: Message = {
      id: `m_${Date.now()}`,
      conversationId,
      waMessageId: undefined,
      type,
      sender: "agent",
      senderName: "Tu",
      content,
      imageUrl: previewUrls?.[0],
      imageUrls: previewUrls,
      internalNote: type === "note",
      createdAt: now,
      updatedAt: now,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const uploadedImageUrls = type === "image" && files?.length ? await uploadImagesToS3(files) : undefined;
      const normalizedContent = type === "image" ? JSON.stringify(uploadedImageUrls ?? []) : content;
      const createdMessage = await sendConversationMessage(
        {
          conversationId,
          from: "agent",
          content: normalizedContent,
          type: type === "note" ? "text" : type,
          waMessageId: "",
          internalNote: type === "note",
        },
        conversation,
      );

      setMessages((prev) =>
        prev.map((message) =>
          message.id === optimisticMessage.id
            ? {
                ...createdMessage,
                imageUrl: uploadedImageUrls?.[0] ?? createdMessage.imageUrl,
                imageUrls: uploadedImageUrls ?? createdMessage.imageUrls,
              }
            : message,
        ),
      );
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje";
      toast.error(message);
      throw error;
    } finally {
      previewUrls?.forEach((url) => URL.revokeObjectURL(url));
      setIsSending(false);
    }
  };

  return { messages, isLoading, isSending, sendMessage };
}

export function useLead(conversation?: Conversation): Lead | undefined {
  if (!conversation) {
    return undefined;
  }

  return {
    id: conversation.leadId,
    name: conversation.leadName,
    phone: conversation.leadPhone,
    createdAt: conversation.createdAt,
  };
}
