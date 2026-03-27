import { useRef, useState } from 'react';
import { Send, StickyNote, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageType } from '@/modules/types';

interface PendingImage {
  file: File;
  previewUrl: string;
}

interface ChatInputProps {
  onSend: (content: string, type: MessageType, files?: File[]) => Promise<void>;
  isSending?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isSending = false, disabled = false }: ChatInputProps) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'text' | 'note'>('text');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  };

  const removePendingImage = (previewUrl: string) => {
    setPendingImages((prev) => {
      const imageToRemove = prev.find((image) => image.previewUrl === previewUrl);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return prev.filter((image) => image.previewUrl !== previewUrl);
    });
  };

  const handleSend = async () => {
    if (disabled) {
      return;
    }

    try {
      if (pendingImages.length > 0) {
        await onSend('', 'image', pendingImages.map((image) => image.file));
        clearPendingImages();
        setText('');
        inputRef.current?.focus();
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) return;

      await onSend(trimmed, mode === 'note' ? 'note' : 'text');
      setText('');
      setMode('text');
      inputRef.current?.focus();
    } catch {
      // Error toast is handled upstream; keep current draft so the agent can retry.
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (disabled) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    const selectedFiles = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith('image/'));

    if (!selectedFiles.length) {
      return;
    }

    const newImages = selectedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPendingImages((prev) => [...prev, ...newImages]);
    setMode('text');
    e.target.value = '';
  };

  const canSend = (text.trim() || pendingImages.length > 0) && !isSending && !disabled;

  return (
    <div className={cn('border-t border-border bg-card safe-bottom relative', disabled && 'bg-muted/55')}>
      {disabled && (
        <div className="absolute inset-0 z-20 bg-foreground/10 backdrop-blur-[1px] pointer-events-auto">
          <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-muted-foreground">
            El bot esta atendiendo esta conversacion. Espera a que pase a En espera para responder.
          </div>
        </div>
      )}

      {mode === 'note' && pendingImages.length === 0 && (
        <div className="px-4 py-1.5 bg-chat-note border-b border-chat-note-border">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <StickyNote className="w-3 h-3" /> Escribiendo nota interna...
          </span>
        </div>
      )}

      {pendingImages.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pendingImages.map((image) => (
              <div key={image.previewUrl} className="relative overflow-hidden rounded-xl border border-border bg-secondary">
                <img
                  src={image.previewUrl}
                  alt={image.file.name}
                  className="h-24 w-full object-cover"
                />
                <button
                  onClick={() => removePendingImage(image.previewUrl)}
                  className="absolute right-2 top-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {pendingImages.length} imagen{pendingImages.length > 1 ? 'es' : ''} lista{pendingImages.length > 1 ? 's' : ''} para enviar
          </p>
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        <button
          onClick={() => setMode((m) => (m === 'note' ? 'text' : 'note'))}
          className={cn(
            'p-2.5 rounded-full transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center',
            mode === 'note' ? 'bg-chat-note text-foreground' : 'text-muted-foreground hover:bg-secondary',
          )}
          title="Nota interna"
          type="button"
          disabled={disabled}
        >
          <StickyNote className="w-5 h-5" />
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="p-2.5 rounded-full transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:bg-secondary"
          title="Adjuntar imagenes"
          type="button"
          disabled={disabled}
        >
          <ImagePlus className="w-5 h-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === 'note'
              ? 'Escribe una nota interna...'
              : pendingImages.length > 0
                ? 'Las imagenes se enviaran como un mensaje de imagen'
                : 'Escribe un mensaje...'
          }
          rows={1}
          disabled={isSending || pendingImages.length > 0 || disabled}
          className="flex-1 resize-none bg-secondary rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] max-h-32 disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          type="button"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
