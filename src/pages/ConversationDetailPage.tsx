import { useParams, useNavigate } from 'react-router-dom';
import { useMessages, useLead, useConversations } from '@/hooks/useConversations';
import { ChatBubble } from '@/components/ChatBubble';
import { ChatInput } from '@/components/ChatInput';
import { LeadPanel } from '@/components/LeadPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { ConversationStateBadge } from '@/components/ConversationStateBadge';
import { ArrowLeft, User, MoreVertical, XCircle, Trash2, Flame, CircleDollarSign } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { allConversations, isLoading, closeConversation, removeConversation, takeConversation, updateConversationSale } = useConversations();
  const conversation = allConversations.find((c) => c.id === id);
  const { messages, isLoading: isLoadingMessages, isSending, sendMessage } = useMessages(id || '', conversation);
  const lead = useLead(conversation);
  const [showLead, setShowLead] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTakingConversation, setIsTakingConversation] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Cargando conversacion...</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Conversacion no encontrada</p>
      </div>
    );
  }

  const isPotentialSale = conversation.isPotentialSale;
  const isSaleClosed = conversation.isClosedSale;
  const isBotHandlingConversation = conversation.status === 'active';

  const handleClose = async () => {
    await closeConversation(conversation.id);
    navigate('/');
  };

  const handleDelete = async () => {
    await removeConversation(conversation.id);
    navigate('/');
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
    <div className="min-h-screen bg-background flex flex-col h-screen">
      <header className="bg-card border-b border-border safe-top sticky top-0 z-30">
        <div className="flex items-center gap-3 px-2 py-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          <button
            onClick={() => setShowLead(true)}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-semibold">{(conversation.leadName || conversation.leadPhone || '?').charAt(0)}</span>
            </div>
            <div className="min-w-0 text-left">
              <h2 className="text-sm font-semibold text-foreground truncate">{conversation.leadName}</h2>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground truncate">{conversation.leadPhone}</p>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-1 flex-shrink-0">
            <ConversationStateBadge
              isPotentialSale={conversation.isPotentialSale}
              isClosedSale={conversation.isClosedSale}
            />
            <StatusBadge status={conversation.status} />

            {conversation.status === 'active' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTakeConversation}
                disabled={isTakingConversation}
                className="h-9"
              >
                Tomar conversacion
              </Button>
            )}

            <button
              onClick={() => setShowLead(true)}
              className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <User className="w-5 h-5 text-muted-foreground" />
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {conversation.status !== 'closed' && (
                  <DropdownMenuItem onClick={handleClose} className="gap-2">
                    <XCircle className="w-4 h-4" />
                    Cerrar conversacion
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar conversacion
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => updateConversationSale(conversation.id, 'potential')}
                  disabled={isPotentialSale}
                  className="gap-2"
                >
                  <Flame className="w-4 h-4" />
                  {isPotentialSale ? 'Ya es venta potencial' : 'Marcar como venta potencial'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => updateConversationSale(conversation.id, 'closed')}
                  disabled={isSaleClosed}
                  className="gap-2"
                >
                  <CircleDollarSign className="w-4 h-4" />
                  {isSaleClosed ? 'Ya es venta cerrada' : 'Marcar como venta cerrada'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-3 py-4 hide-scrollbar">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Cargando mensajes...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No hay mensajes en esta conversacion
          </div>
        ) : (
          messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))
        )}
        <div ref={bottomRef} />
      </main>

      <ChatInput onSend={sendMessage} isSending={isSending} disabled={isBotHandlingConversation} />

      {showLead && <LeadPanel lead={lead} onClose={() => setShowLead(false)} />}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar conversacion</AlertDialogTitle>
            <AlertDialogDescription>
              Esto eliminara permanentemente la conversacion con {conversation.leadName}. Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
