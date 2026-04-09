import { AssignedUser, Conversation, ConversationStatus, MessageSender } from "@/modules/types";
import { apiFetch } from "@/api/apiClient";

interface GetConversationsParams {
  status?: ConversationStatus;
}

interface ConversationLastMessageApiResponse {
  id?: string;
  _id?: string;
  from?: string;
  type?: string;
  content?: string | null;
  createdAt?: string;
}

interface ConversationApiResponse {
  id?: string;
  _id?: string;
  waId?: string;
  leadId?: string;
  leadName?: string;
  leadPhone?: string;
  status?: ConversationStatus;
  currentState?: string;
  origin?: Conversation["origin"];
  lastMessageId?: string;
  lastMessageSender?: string;
  lastMessageFrom?: string;
  assignedTo?:
    | string
    | {
        _id?: string;
        id?: string;
        name?: string;
        email?: string;
        role?: string;
        active?: boolean;
      };
  lastMessage?:
    | string
    | ConversationLastMessageApiResponse
    | null;
  lastMessageAt?: string;
  lastReadAt?: string | null;
  lockUntil?: string | null;
  unreadCount?: number;
  isPotentialSale?: boolean;
  isClosedSale?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
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

function normalizeConversationStatus(status?: string): ConversationStatus {
  if (status === "active" || status === "waiting_human" || status === "closed") {
    return status;
  }

  return "active";
}

function normalizeConversationOrigin(origin?: string): Conversation["origin"] {
  return origin === "nacional" ? "nacional" : "monterrey";
}

function formatPhoneNumber(rawPhone: string): string {
  if (!rawPhone) {
    return "";
  }

  if (rawPhone.startsWith("+")) {
    return rawPhone;
  }

  return `+${rawPhone}`;
}

function getDisplayName(apiConversation: ConversationApiResponse, waId: string): string {
  if (typeof apiConversation.leadName === "string" && apiConversation.leadName.trim()) {
    return apiConversation.leadName.trim();
  }

  return waId ? `Contacto ${waId.slice(-4)}` : "Contacto sin nombre";
}

function getDisplayPhone(apiConversation: ConversationApiResponse, waId: string): string {
  if (typeof apiConversation.leadPhone === "string" && apiConversation.leadPhone.trim()) {
    return formatPhoneNumber(apiConversation.leadPhone.trim());
  }

  return formatPhoneNumber(waId);
}

function normalizeAssignedTo(assignedTo: ConversationApiResponse["assignedTo"]): AssignedUser | undefined {
  if (!assignedTo || typeof assignedTo !== "object") {
    return undefined;
  }

  const id = typeof assignedTo._id === "string" ? assignedTo._id : typeof assignedTo.id === "string" ? assignedTo.id : "";

  if (!id) {
    return undefined;
  }

  return {
    id,
    name: typeof assignedTo.name === "string" && assignedTo.name.trim() ? assignedTo.name : "Sin nombre",
    email: typeof assignedTo.email === "string" ? assignedTo.email : "",
    role: typeof assignedTo.role === "string" ? assignedTo.role : "",
    active: typeof assignedTo.active === "boolean" ? assignedTo.active : false,
  };
}

function normalizeMessageSender(sender?: string): MessageSender | undefined {
  if (sender === "user" || sender === "agent" || sender === "bot") {
    return sender;
  }

  if (sender === "customer" || sender === "client" || sender === "lead") {
    return "user";
  }

  return undefined;
}

function getLastMessageObject(lastMessage: ConversationApiResponse["lastMessage"]): ConversationLastMessageApiResponse | undefined {
  if (lastMessage && typeof lastMessage === "object") {
    return lastMessage;
  }

  return undefined;
}

function getLastMessageId(lastMessage: ConversationApiResponse["lastMessage"], fallbackId?: string): string | undefined {
  if (typeof fallbackId === "string") {
    return fallbackId;
  }

  const lastMessageObject = getLastMessageObject(lastMessage);

  if (lastMessageObject) {
    if (typeof lastMessageObject.id === "string") {
      return lastMessageObject.id;
    }

    if (typeof lastMessageObject._id === "string") {
      return lastMessageObject._id;
    }
  }

  return undefined;
}

function getLastMessageSender(apiConversation: ConversationApiResponse): MessageSender | undefined {
  const directSender = normalizeMessageSender(apiConversation.lastMessageSender);

  if (directSender) {
    return directSender;
  }

  const fallbackSender = normalizeMessageSender(apiConversation.lastMessageFrom);

  if (fallbackSender) {
    return fallbackSender;
  }

  const lastMessageObject = getLastMessageObject(apiConversation.lastMessage);

  if (lastMessageObject) {
    return normalizeMessageSender(lastMessageObject.from);
  }

  return undefined;
}

function getLastMessageContent(lastMessage: ConversationApiResponse["lastMessage"]): string {
  if (typeof lastMessage === "string" && lastMessage.trim()) {
    return lastMessage;
  }

  const lastMessageObject = getLastMessageObject(lastMessage);

  if (lastMessageObject && typeof lastMessageObject.content === "string" && lastMessageObject.content.trim()) {
    return lastMessageObject.content;
  }

  return "Sin mensajes";
}

function getLastMessageAt(apiConversation: ConversationApiResponse): string {
  if (typeof apiConversation.lastMessageAt === "string") {
    return apiConversation.lastMessageAt;
  }

  const lastMessageObject = getLastMessageObject(apiConversation.lastMessage);

  if (lastMessageObject && typeof lastMessageObject.createdAt === "string") {
    return lastMessageObject.createdAt;
  }

  if (typeof apiConversation.updatedAt === "string") {
    return apiConversation.updatedAt;
  }

  return new Date(0).toISOString();
}

function mapConversation(apiConversation: ConversationApiResponse): Conversation {
  const id = typeof apiConversation.id === "string" ? apiConversation.id : typeof apiConversation._id === "string" ? apiConversation._id : "";
  const waId = typeof apiConversation.waId === "string" ? apiConversation.waId : "";
  const leadPhone = getDisplayPhone(apiConversation, waId);

  return {
    id,
    waId,
    leadId: typeof apiConversation.leadId === "string" ? apiConversation.leadId : id,
    leadName: getDisplayName(apiConversation, waId),
    leadPhone,
    status: normalizeConversationStatus(apiConversation.status),
    currentState: typeof apiConversation.currentState === "string" ? apiConversation.currentState : "MENU",
    origin: normalizeConversationOrigin(typeof apiConversation.origin === "string" ? apiConversation.origin : undefined),
    assignedTo: normalizeAssignedTo(apiConversation.assignedTo),
    lastMessageId: getLastMessageId(apiConversation.lastMessage, apiConversation.lastMessageId),
    lastMessageSender: getLastMessageSender(apiConversation),
    lastMessage: getLastMessageContent(apiConversation.lastMessage),
    lastMessageAt: getLastMessageAt(apiConversation),
    lastReadAt: typeof apiConversation.lastReadAt === "string" || apiConversation.lastReadAt === null ? apiConversation.lastReadAt : null,
    lockUntil: typeof apiConversation.lockUntil === "string" || apiConversation.lockUntil === null ? apiConversation.lockUntil : null,
    unreadCount: typeof apiConversation.unreadCount === "number" ? apiConversation.unreadCount : 0,
    isPotentialSale: apiConversation.isPotentialSale === true,
    isClosedSale: apiConversation.isClosedSale === true,
    createdAt: typeof apiConversation.createdAt === "string" ? apiConversation.createdAt : new Date(0).toISOString(),
    updatedAt: typeof apiConversation.updatedAt === "string" ? apiConversation.updatedAt : new Date(0).toISOString(),
  };
}

export async function getConversations(params: GetConversationsParams = {}): Promise<Conversation[]> {
  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set("status", params.status);
  }

  const query = searchParams.toString();
  const response = await apiFetch(query ? `/conversations?${query}` : "/conversations");

  await assertOk(response, "No se pudieron cargar las conversaciones");

  const data = await readJson<ConversationApiResponse[] | { data?: ConversationApiResponse[] }>(response);
  const conversations = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  return conversations.map(mapConversation);
}

export async function getConversationUpdates(since: string): Promise<Conversation[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("since", since);

  const response = await apiFetch(`/conversations/updates?${searchParams.toString()}`);

  await assertOk(response, "No se pudieron cargar las actualizaciones de conversaciones");

  const data = await readJson<ConversationApiResponse[] | { data?: ConversationApiResponse[] }>(response);
  const conversations = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  return conversations.map(mapConversation);
}

export async function deleteConversations(ids: string[]): Promise<void> {
  const response = await apiFetch("/conversations", {
    method: "DELETE",
    includeJsonContentType: true,
    body: JSON.stringify({ ids }),
  });

  await assertOk(response, "No se pudieron eliminar las conversaciones");
}

export async function assignConversation(conversationId: string): Promise<void> {
  const response = await apiFetch(`/conversations/${conversationId}/assign`, {
    method: "PATCH",
  });

  await assertOk(response, "No se pudo asignar la conversacion");
}

export async function takeConversation(conversationId: string): Promise<void> {
  const response = await apiFetch(`/conversations/${conversationId}/take`, {
    method: "PATCH",
  });

  await assertOk(response, "No se pudo tomar la conversacion");
}

export async function updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void> {
  const response = await apiFetch(`/conversations/${conversationId}/status`, {
    method: "PATCH",
    includeJsonContentType: true,
    body: JSON.stringify({ status }),
  });

  await assertOk(response, "No se pudo actualizar el estado de la conversacion");
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const response = await apiFetch(`/conversations/${conversationId}/read`, {
    method: "PATCH",
  });

  await assertOk(response, "No se pudo marcar la conversacion como leida");
}

export async function updateConversationSale(
  conversationId: string,
  payload: { isPotentialSale: boolean; isClosedSale: boolean },
): Promise<void> {
  const response = await apiFetch(`/conversations/${conversationId}/sale`, {
    method: "PATCH",
    includeJsonContentType: true,
    body: JSON.stringify(payload),
  });

  await assertOk(response, "No se pudo actualizar el estado de venta de la conversacion");
}

export async function closeConversation(conversationId: string): Promise<void> {
  await updateConversationStatus(conversationId, "closed");
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await deleteConversations([conversationId]);
}
