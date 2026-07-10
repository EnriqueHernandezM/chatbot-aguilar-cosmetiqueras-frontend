import { useCallback, useEffect, useMemo, useState } from "react";
import { Conversation, ConversationStatus, GalleryItem, Lead, Message } from "@/modules/types";
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
  updateConversationNickname as apiUpdateConversationNickname,
  updateConversationSale as apiUpdateConversationSale,
  updateConversationStatus as apiUpdateConversationStatus,
} from "@/api/conversationsApi";
import { getConversationMessages, sendConversationMessage } from "@/api/messagesApi";
import { uploadImagesToCloudinary } from "@/services/cloudinaryUpload";
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

function getStoredStatusFilter(): InboxFilter {
  try {
    const value = localStorage.getItem("statusFilter");
    if (value === "all" || value === "active" || value === "waiting_human" || value === "closed" || value === "potential_sale" || value === "sale_closed") {
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

function getConversationActivityTime(conversation: Conversation) {
  const lastMessageTime = new Date(conversation.lastMessageAt).getTime();
  const createdTime = new Date(conversation.createdAt).getTime();
  const candidateTimes = [lastMessageTime, createdTime].filter((time) => Number.isFinite(time) && time > 0);

  if (candidateTimes.length > 0) {
    return Math.max(...candidateTimes);
  }

  return 0;
}

export function useConversations(options?: { enablePolling?: boolean }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilterState] = useState<InboxFilter>(getStoredStatusFilter);
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

  const setStatusFilter = useCallback((value: InboxFilter) => {
    setStatusFilterState(value);

    try {
      localStorage.setItem("statusFilter", value);
    } catch {
      // Ignore localStorage failures and keep UI state in memory.
    }
  }, []);

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

    return [...list].sort((a, b) => getConversationActivityTime(b) - getConversationActivityTime(a));
  }, [conversations, statusFilter, flowFilter, originFilter]);

  const assignConversation = useCallback(
    async (id: string, agentId: string) => {
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
    },
    [conversations],
  );

  const updateStatus = useCallback(
    async (id: string, status: ConversationStatus) => {
      const previousConversations = conversations;

      setConversations((prev) => prev.map((conversation) => (conversation.id === id ? { ...conversation, status } : conversation)));

      try {
        await apiUpdateConversationStatus(id, status);
        toast.success("Estado actualizado");
      } catch (error) {
        setConversations(previousConversations);
        const message = error instanceof Error ? error.message : "No se pudo actualizar el estado";
        toast.error(message);
      }
    },
    [conversations],
  );

  const takeConversation = useCallback(
    async (id: string) => {
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
    },
    [conversations, user],
  );

  const markRead = useCallback(
    async (id: string) => {
      try {
        await markConversationRead(id);
        await loadConversations();
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo marcar la conversacion como leida";
        toast.error(message);
      }
    },
    [loadConversations],
  );

  const closeConversation = useCallback(
    async (id: string) => {
      const previousConversations = conversations;

      setConversations((prev) => prev.map((conversation) => (conversation.id === id ? { ...conversation, status: "closed" as ConversationStatus } : conversation)));

      try {
        await apiCloseConversation(id);
        toast.success("Conversacion cerrada");
      } catch (error) {
        setConversations(previousConversations);
        const message = error instanceof Error ? error.message : "Error al cerrar la conversacion";
        toast.error(message);
        throw error;
      }
    },
    [conversations],
  );

  const removeConversation = useCallback(
    async (id: string) => {
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
    },
    [conversations],
  );

  const updateConversationSale = useCallback(
    async (id: string, saleType: "potential" | "closed") => {
      const previousConversations = conversations;

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

      try {
        const targetConversation = previousConversations.find((conversation) => conversation.id === id);

        await apiUpdateConversationSale(id, {
          isPotentialSale: saleType === "potential" ? true : (targetConversation?.isPotentialSale ?? false),
          isClosedSale: saleType === "closed" ? true : (targetConversation?.isClosedSale ?? false),
        });

        toast.success(saleType === "potential" ? "Marcada como venta potencial" : "Marcada como venta cerrada");
      } catch (error) {
        setConversations(previousConversations);
        const message = error instanceof Error ? error.message : "No se pudo actualizar el estado de venta";
        toast.error(message);
        throw error;
      }
    },
    [conversations],
  );

  // Actualiza el alias (nickname) de una conversacion. Ademas de guardar el valor
  // crudo, recalcula leadName localmente (nickname si existe, si no el telefono)
  // para que el listado refleje el alias sin esperar al proximo fetch/polling.
  const updateNickname = useCallback(
    async (id: string, nickname: string | null) => {
      const previousConversations = conversations;
      const normalizedNickname = nickname && nickname.trim() ? nickname.trim() : null;

      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === id
            ? {
                ...conversation,
                nickname: normalizedNickname,
                leadName: normalizedNickname || conversation.leadPhone,
              }
            : conversation,
        ),
      );

      try {
        await apiUpdateConversationNickname(id, normalizedNickname);
        toast.success("Alias actualizado");
      } catch (error) {
        setConversations(previousConversations);
        const message = error instanceof Error ? error.message : "No se pudo actualizar el alias";
        toast.error(message);
        throw error;
      }
    },
    [conversations],
  );

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
    updateNickname,
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
      const uploadedImageUrls = type === "image" && files?.length ? await uploadImagesToCloudinary(files) : undefined;
      const normalizedContent = type === "image" ? JSON.stringify(uploadedImageUrls ?? []) : content;
      const createdMessage = await sendConversationMessage(
        {
          conversationId,
          from: "agent",
          content: normalizedContent,
          type: type === "note" ? "text" : type,
          waMessageId: "",
          internalNote: type === "note",
          source: type === "image" && files?.length ? "device" : undefined,
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

  const sendGalleryImage = async (item: GalleryItem, caption?: string) => {
    const now = new Date().toISOString();
    const trimmedCaption = caption?.trim();
    const optimisticMessage: Message = {
      id: `m_${Date.now()}`,
      conversationId,
      waMessageId: undefined,
      type: "image",
      sender: "agent",
      senderName: "Tu",
      content: trimmedCaption ?? "",
      imageUrl: item.url,
      imageUrls: [item.url],
      internalNote: false,
      createdAt: now,
      updatedAt: now,
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsSending(true);

    try {
      const createdMessage = await sendConversationMessage(
        {
          conversationId,
          from: "agent",
          content: item.url,
          type: "image",
          waMessageId: "",
          internalNote: false,
          source: "gallery",
        },
        conversation,
      );

      setMessages((prev) =>
        prev.map((message) =>
          message.id === optimisticMessage.id
            ? {
                ...createdMessage,
                imageUrl: createdMessage.imageUrl ?? item.url,
                imageUrls: createdMessage.imageUrls ?? [item.url],
              }
            : message,
        ),
      );

      if (trimmedCaption) {
        await sendMessage(trimmedCaption, "text");
      }
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== optimisticMessage.id));
      const message = error instanceof Error ? error.message : "No se pudo enviar la imagen de la galeria";
      toast.error(message);
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return { messages, isLoading, isSending, sendMessage, sendGalleryImage };
}

export function useLead(conversation?: Conversation): Lead | undefined {
  if (!conversation) {
    return undefined;
  }

  return {
    id: conversation.leadId,
    name: conversation.leadName,
    phone: conversation.leadPhone,
    nickname: conversation.nickname ?? null,
    createdAt: conversation.createdAt,
  };
}
