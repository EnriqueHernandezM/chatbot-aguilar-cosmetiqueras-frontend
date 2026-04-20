export type ConversationStatus = "active" | "waiting_human" | "closed";
export type ConversationState =
  | "MENU"
  | "SHOW_MODELS"
  | "SHOW_DYNAMICS"
  | "SHOW_DELIVERY"
  | "SHOW_LOCATION"
  | "POST_INFO_MENU"
  | "CAPTURE_QUOTE_DATA"
  | "OPEN_QUESTION"
  | "WAITING_HUMAN"
  | "HUMAN_HANDOFF"
  | "SALE_CLOSED"
  | "IDLE"
  | string;

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AssignedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  notes?: string;
  createdAt: string;
}

export type ConversationOrigin = "monterrey" | "nacional";

export interface Conversation {
  id: string;
  waId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  status: ConversationStatus;
  currentState: ConversationState;
  origin: ConversationOrigin;
  assignedTo?: AssignedUser;
  lastMessageId?: string;
  lastMessageSender?: MessageSender;
  lastMessage: string;
  lastMessageAt: string;
  lastReadAt?: string | null;
  lockUntil?: string | null;
  unreadCount: number;
  isPotentialSale: boolean;
  isClosedSale: boolean;
  hasRecentUpdate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type MessageType = "text" | "image" | "note" | "sticker";
export type MessageSender = "user" | "agent" | "bot";

export interface Message {
  id: string;
  conversationId: string;
  waMessageId?: string;
  type: MessageType;
  sender: MessageSender;
  senderName: string;
  content: string;
  imageUrl?: string;
  imageUrls?: string[];
  internalNote: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuickReplyTemplate {
  id: string;
  title: string;
  content: string;
  category?: string;
  order?: number;
}

export interface AuthCredentials {
  email: string;
  password: string;
}
