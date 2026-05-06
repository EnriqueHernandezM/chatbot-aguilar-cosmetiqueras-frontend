import { apiFetch } from "@/api/apiClient";
import { Conversation, Message, MessageSender, MessageType } from "@/modules/types";

interface MessageApiResponse {
  _id?: string;
  id?: string;
  conversationId?: string;
  waMessageId?: string;
  from?: string;
  type?: string;
  content?: string | string[];
  imageUrl?: string;
  internalNote?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface SendMessagePayload {
  conversationId: string;
  from: "agent";
  content: string;
  type: MessageType;
  waMessageId: string;
  internalNote: boolean;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function assertOk(response: Response, fallbackMessage: string) {
  if (response.ok) {
    return;
  }

  const data = await readJson<{ message?: string }>(response);
  const message = data?.message && typeof data.message === "string" ? data.message : fallbackMessage;

  throw new Error(message);
}

function normalizeSender(from?: string): MessageSender {
  if (from === "agent" || from === "bot" || from === "user") {
    return from;
  }

  return "user";
}

function normalizeMessageType(type?: string): MessageType {
  if (type === "image" || type === "note" || type === "text" || type === "sticker") {
    return type;
  }

  return "text";
}

function extractImageUrls(content?: string | string[]): string[] | undefined {
  if (!content) {
    return undefined;
  }

  if (Array.isArray(content)) {
    const urls = content.filter((value): value is string => typeof value === "string" && value.length > 0);
    return urls.length ? urls : undefined;
  }

  try {
    const parsed = JSON.parse(content) as unknown;

    if (Array.isArray(parsed)) {
      const urls = parsed.filter((value): value is string => typeof value === "string" && value.length > 0);
      return urls.length ? urls : undefined;
    }
  } catch {
    if (content.startsWith("http://") || content.startsWith("https://")) {
      return [content];
    }
  }

  return undefined;
}

function normalizeImageUrls(type: MessageType, content?: string | string[]): string[] | undefined {
  if (type !== "image") {
    return undefined;
  }

  return extractImageUrls(content);
}

function normalizeMessageContent(content?: string | string[]): string {
  return typeof content === "string" ? content : "";
}

function getSenderName(sender: MessageSender, conversation?: Conversation): string {
  if (sender === "bot") {
    return "Bot";
  }

  if (sender === "agent") {
    return conversation?.assignedTo?.name || "Agente";
  }

  return conversation?.leadName || conversation?.leadPhone || "Cliente";
}

function mapMessage(apiMessage: MessageApiResponse, conversation?: Conversation): Message {
  const sender = normalizeSender(apiMessage.from);
  const type = apiMessage.internalNote ? "note" : normalizeMessageType(apiMessage.type);
  const imageUrls = normalizeImageUrls(type, apiMessage.content);

  return {
    id: typeof apiMessage.id === "string" ? apiMessage.id : typeof apiMessage._id === "string" ? apiMessage._id : "",
    conversationId: typeof apiMessage.conversationId === "string" ? apiMessage.conversationId : conversation?.id || "",
    waMessageId: typeof apiMessage.waMessageId === "string" ? apiMessage.waMessageId : undefined,
    type,
    sender,
    senderName: getSenderName(sender, conversation),
    content: imageUrls ? "" : normalizeMessageContent(apiMessage.content),
    imageUrl: imageUrls?.[0] ?? (typeof apiMessage.imageUrl === "string" ? apiMessage.imageUrl : undefined),
    imageUrls,
    internalNote: apiMessage.internalNote === true,
    createdAt: typeof apiMessage.createdAt === "string" ? apiMessage.createdAt : new Date(0).toISOString(),
    updatedAt: typeof apiMessage.updatedAt === "string" ? apiMessage.updatedAt : new Date(0).toISOString(),
  };
}

export async function getConversationMessages(conversationId: string, conversation?: Conversation): Promise<Message[]> {
  const params = new URLSearchParams({ conversationId });
  const response = await apiFetch(`/messages?${params.toString()}`);

  await assertOk(response, "No se pudieron cargar los mensajes");

  const data = await readJson<MessageApiResponse[] | { data?: MessageApiResponse[] }>(response);
  const messages = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  return messages.map((message) => mapMessage(message, conversation));
}

export async function sendConversationMessage(payload: SendMessagePayload, conversation?: Conversation): Promise<Message> {
  const response = await apiFetch("/messages/send", {
    method: "POST",
    includeJsonContentType: true,
    body: JSON.stringify(payload),
  });

  await assertOk(response, "No se pudo enviar el mensaje");

  const data = await readJson<MessageApiResponse | { data?: MessageApiResponse }>(response);
  const message = data && !Array.isArray(data) && "data" in data ? data.data : data;

  if (message) {
    return mapMessage(message, conversation);
  }

  return mapMessage(
    {
      id: `tmp_${Date.now()}`,
      conversationId: payload.conversationId,
      waMessageId: payload.waMessageId,
      from: payload.from,
      type: payload.type,
      content: payload.content,
      internalNote: payload.internalNote,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    conversation,
  );
}
