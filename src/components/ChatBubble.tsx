import { Message } from '@/modules/types';
import { cn } from '@/lib/utils';
import { StickyNote } from 'lucide-react';
import { ImagePreview } from './ImagePreview';
import { formatWhatsAppText } from '@/lib/formatWhatsApp';

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isAgent = message.sender === 'agent';
  const isBot = message.sender === 'bot';
  const isNote = message.internalNote || message.type === 'note';
  const isRight = isAgent || isBot;
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isNote) {
    return (
      <div className="my-1.5 flex w-full max-w-full justify-center overflow-hidden animate-slide-up">
        <div className="flex max-w-[92%] min-w-0 items-start gap-2 rounded-lg border border-chat-note-border bg-chat-note px-3 py-2">
          <StickyNote className="w-4 h-4 text-chat-note-border mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs font-medium text-muted-foreground block mb-0.5">Nota interna</span>
            <p className="text-sm text-foreground [overflow-wrap:anywhere]">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('mb-1.5 flex w-full max-w-full overflow-hidden animate-slide-up', isRight ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[92%] min-w-0 rounded-2xl px-3 py-2',
          isRight ? 'bg-chat-agent rounded-br-md' : 'bg-chat-user border border-border rounded-bl-md',
        )}
      >
        {!isRight && (
          <span className="text-xs font-medium text-muted-foreground block mb-1">{message.senderName}</span>
        )}
        {isBot && (
          <span className="text-xs font-medium text-primary block mb-1">Bot</span>
        )}

        {message.type === 'image' && message.imageUrls?.length ? (
          <div className={cn('grid gap-2 mb-2', message.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {message.imageUrls.map((imageUrl, index) => (
              <ImagePreview key={`${imageUrl}-${index}`} src={imageUrl} alt={`Imagen ${index + 1}`} />
            ))}
          </div>
        ) : message.type === 'image' && message.imageUrl ? (
          <ImagePreview src={message.imageUrl} alt={message.content || 'Imagen'} className="mb-2" />
        ) : null}

        {message.content && (
          <p className={cn(
            'whitespace-pre-wrap text-sm leading-snug text-foreground [overflow-wrap:anywhere]',
            isRight && 'break-all',
          )}>
            {formatWhatsAppText(message.content)}
          </p>
        )}

        <span className="mt-1 block text-right text-[10px] text-muted-foreground">{time}</span>
      </div>
    </div>
  );
}
