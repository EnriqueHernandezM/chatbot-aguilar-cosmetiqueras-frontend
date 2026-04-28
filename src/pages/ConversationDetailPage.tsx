import { useParams, useNavigate } from "react-router-dom";
import { useMessages, useLead, useConversations } from "@/hooks/useConversations";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { LeadPanel } from "@/components/LeadPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { ConversationStateBadge } from "@/components/ConversationStateBadge";
import { ArrowLeft, User, MoreVertical, XCircle, Trash2, Flame, CircleDollarSign } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { allConversations, isLoading, closeConversation, removeConversation, takeConversation, updateConversationSale } = useConversations();
  const conversation = allConversations.find((c) => c.id === id);
  const { messages, isLoading: isLoadingMessages, isSending, sendMessage } = useMessages(id || "", conversation);
  const lead = useLead(conversation);
  const [showLead, setShowLead] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTakingConversation, setIsTakingConversation] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolledRef = useRef(false);
  const hasLoadedInitialMessagesRef = useRef(false);
  const previousMessageCountRef = useRef(0);

  useEffect(() => {
    hasAutoScrolledRef.current = false;
    hasLoadedInitialMessagesRef.current = false;
    previousMessageCountRef.current = 0;
  }, [id]);

  useEffect(() => {
    if (isLoadingMessages || messages.length === 0) {
      previousMessageCountRef.current = messages.length;
      return;
    }

    if (!hasLoadedInitialMessagesRef.current) {
      hasLoadedInitialMessagesRef.current = true;
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      hasAutoScrolledRef.current = true;
      previousMessageCountRef.current = messages.length;
      return;
    }

    if (messages.length > previousMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: hasAutoScrolledRef.current ? "smooth" : "auto" });
      hasAutoScrolledRef.current = true;
    }

    previousMessageCountRef.current = messages.length;
  }, [isLoadingMessages, messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-center text-muted-foreground">Cargando conversacion...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-center text-muted-foreground">Conversacion no encontrada</p>
      </div>
    );
  }

  const isPotentialSale = conversation.isPotentialSale;
  const isSaleClosed = conversation.isClosedSale;
  const isBotHandlingConversation = conversation.status === "active";

  const handleClose = async () => {
    await closeConversation(conversation.id);
    navigate("/");
  };

  const handleDelete = async () => {
    setIsDeletingConversation(true);

    try {
      await removeConversation(conversation.id);
      setShowDeleteConfirm(false);
      navigate("/");
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const handleTakeConversation = async () => {
    setIsTakingConversation(true);

    try {
      await takeConversation(conversation.id);
    } finally {
      setIsTakingConversation(false);
    }
  };

  return (
    <div className="grid h-[100dvh] w-full max-w-full grid-rows-[auto,minmax(0,1fr),auto] overflow-hidden bg-background">
      <header className="bg-card border-b border-border safe-top sticky top-0 z-30">
        <div className="grid w-full max-w-full grid-cols-[auto,minmax(0,1fr),auto] items-center gap-2 overflow-hidden px-2 py-2">
          <button onClick={() => navigate("/")} className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <button onClick={() => setShowLead(true)} className="flex min-w-0 flex-1 items-center">
            <div className="min-w-0 text-left">
              <h2 className="text-sm font-semibold text-foreground truncate">{conversation.leadName}</h2>
              <p className="text-xs text-muted-foreground truncate">{conversation.leadPhone}</p>
            </div>
          </button>

          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 overflow-hidden">
            <div className="hidden items-center gap-1 sm:flex">
              <ConversationStateBadge isPotentialSale={conversation.isPotentialSale} isClosedSale={conversation.isClosedSale} />
              <StatusBadge status={conversation.status} />
            </div>

            <div className="flex items-center gap-1 sm:hidden">
              <ConversationStateBadge isPotentialSale={conversation.isPotentialSale} isClosedSale={conversation.isClosedSale} compact />
              <StatusBadge status={conversation.status} />
            </div>

            {conversation.status === "active" && (
              <Button type="button" variant="outline" size="sm" onClick={handleTakeConversation} disabled={isTakingConversation} className="h-8 px-2 text-xs sm:px-2">
                <span className="hidden sm:inline">Tomar chat</span>
                <span className="sm:hidden">Tomar chat</span>
              </Button>
            )}

            <button onClick={() => setShowLead(true)} className="hidden min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-2 hover:bg-secondary sm:flex">
              <User className="w-5 h-5 text-muted-foreground" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {conversation.status !== "closed" && (
                  <DropdownMenuItem onClick={handleClose} className="gap-2">
                    <XCircle className="w-4 h-4" />
                    Cerrar conversacion
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="gap-2 text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4" />
                  Eliminar conversacion
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => updateConversationSale(conversation.id, "potential")} disabled={isPotentialSale} className="gap-2">
                  <Flame className="w-4 h-4" />
                  {isPotentialSale ? "Ya es venta potencial" : "Marcar como venta potencial"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateConversationSale(conversation.id, "closed")} disabled={isSaleClosed} className="gap-2">
                  <CircleDollarSign className="w-4 h-4" />
                  {isSaleClosed ? "Ya es venta cerrada" : "Marcar como venta cerrada"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="hide-scrollbar min-h-0 w-full max-w-full overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-3 [touch-action:pan-y]" style={{ WebkitOverflowScrolling: "touch" }}>
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">Cargando mensajes...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">No hay mensajes en esta conversacion</div>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </main>

      <ChatInput onSend={sendMessage} isSending={isSending} disabled={isBotHandlingConversation} />

      {showLead && <LeadPanel lead={lead} onClose={() => setShowLead(false)} />}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conversacion</AlertDialogTitle>
            <AlertDialogDescription>Esto eliminara permanentemente la conversacion con {conversation.leadName}. Esta accion no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingConversation}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeletingConversation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingConversation ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
