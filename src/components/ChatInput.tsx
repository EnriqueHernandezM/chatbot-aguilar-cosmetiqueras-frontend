import { useEffect, useRef, useState } from "react";
import { Send, StickyNote, ImagePlus, Images, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { GalleryItem, MessageType } from "@/modules/types";
import { QuickReplySheet } from "@/components/QuickReplySheet";
import { GallerySheet } from "@/components/GallerySheet";

interface PendingDeviceImage {
  id: string;
  source: "device";
  file: File;
  previewUrl: string;
  name: string;
}

interface PendingGalleryImage {
  id: string;
  source: "gallery";
  item: GalleryItem;
  previewUrl: string;
  name: string;
}

type PendingImage = PendingDeviceImage | PendingGalleryImage;

interface ChatInputProps {
  onSend: (content: string, type: MessageType, files?: File[]) => Promise<void>;
  // Opcional: si no se pasa, el boton de galeria no se muestra (compatibilidad con usos actuales de ChatInput).
  onSendGalleryImage?: (item: GalleryItem, caption?: string) => Promise<void>;
  isSending?: boolean;
  disabled?: boolean;
}

// Debe coincidir con max-h-32 del textarea (32 * 4px = 128px)
const TEXTAREA_MAX_HEIGHT = 128;

export function ChatInput({ onSend, onSendGalleryImage, isSending = false, disabled = false }: ChatInputProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "note">("text");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [showQuickReply, setShowQuickReply] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-resize: el textarea crece con el contenido hasta el máximo definido,
  // y a partir de ahí hace scroll interno (overflow-y-auto en className).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
  }, [text, pendingImages.length]);

  const clearPendingImages = () => {
    setPendingImages((prev) => {
      prev.forEach((image) => {
        if (image.source === "device") {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      return [];
    });
  };

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const imageToRemove = prev.find((image) => image.id === id);
      if (imageToRemove?.source === "device") {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      return prev.filter((image) => image.id !== id);
    });
  };

  const handleSend = async () => {
    if (disabled) {
      return;
    }

    try {
      if (pendingImages.length > 0) {
        const trimmed = text.trim();
        const deviceImages = pendingImages.filter((image): image is PendingDeviceImage => image.source === "device");
        const galleryImages = pendingImages.filter((image): image is PendingGalleryImage => image.source === "gallery");

        if (deviceImages.length > 0) {
          await onSend(
            "",
            "image",
            deviceImages.map((image) => image.file),
          );
        }

        if (onSendGalleryImage) {
          for (const image of galleryImages) {
            await onSendGalleryImage(image.item);
          }
        }

        if (trimmed) {
          await onSend(trimmed, "text");
        }

        clearPendingImages();
        setText("");
        inputRef.current?.focus();
        return;
      }

      const trimmed = text.trim();
      if (!trimmed) return;

      await onSend(trimmed, mode === "note" ? "note" : "text");
      setText("");
      setMode("text");
      inputRef.current?.focus();
    } catch {
      // Error toast is handled upstream; keep current draft so the agent can retry.
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (disabled) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      return;
    }

    const selectedFiles = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith("image/"));

    if (!selectedFiles.length) {
      return;
    }

    const newImages: PendingImage[] = selectedFiles.map((file) => ({
      id: `device_${file.name}_${file.lastModified}_${crypto.randomUUID()}`,
      source: "device",
      file,
      previewUrl: URL.createObjectURL(file),
      name: file.name,
    }));

    setPendingImages((prev) => [...prev, ...newImages]);
    setMode("text");
    e.target.value = "";
  };

  const handleSelectGalleryImages = (items: GalleryItem[]) => {
    if (disabled) {
      return;
    }

    setPendingImages((prev) => [
      ...prev,
      ...items.map((item) => ({
        id: `gallery_${item.id}_${crypto.randomUUID()}`,
        source: "gallery",
        item,
        previewUrl: item.url,
        name: item.title || "Imagen de galeria",
      })),
    ]);
    setMode("text");

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const canSend = (text.trim() || pendingImages.length > 0) && !isSending && !disabled;

  const handleSelectQuickReply = (content: string) => {
    setMode("text");
    setText((prev) => (prev.trim() ? `${prev.trim()}\n${content}` : content));

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <>
      <div className={cn("safe-bottom relative w-full max-w-full overflow-x-hidden border-t border-border bg-card", disabled && "bg-muted/55")}>
        {disabled && (
          <div className="absolute inset-0 z-20 overflow-hidden bg-foreground/10 backdrop-blur-[1px] pointer-events-auto">
            <div className="flex h-full items-center justify-center px-4 text-center text-sm font-medium text-muted-foreground">
              El bot esta atendiendo esta conversacion. Espera a que pase a En espera para responder.
            </div>
          </div>
        )}

        {mode === "note" && pendingImages.length === 0 && (
          <div className="border-b border-chat-note-border bg-chat-note px-3 py-1.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <StickyNote className="w-3 h-3" /> Escribiendo nota interna...
            </span>
          </div>
        )}

        {pendingImages.length > 0 && (
          <div className="px-3 pb-1 pt-2">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {pendingImages.map((image) => (
                <div key={image.id} className="relative overflow-hidden rounded-xl border border-border bg-secondary">
                  <img src={image.previewUrl} alt={image.name} className="h-24 w-full object-cover" />
                  <button onClick={() => removePendingImage(image.id)} className="absolute right-2 top-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center" type="button">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {pendingImages.length} imagen{pendingImages.length > 1 ? "es" : ""} lista{pendingImages.length > 1 ? "s" : ""} para enviar
            </p>
          </div>
        )}

        <div className="flex w-full max-w-full min-w-0 flex-col gap-1 p-2">
          {/* Fila del textarea: ocupa todo el ancho y crece hacia arriba */}
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === "note" ? "Escribe una nota interna..." : pendingImages.length > 0 ? "Agrega un mensaje para enviar con las imagenes..." : "Escribe un mensaje..."}
            rows={1}
            disabled={isSending || disabled}
            className="min-h-[44px] w-full min-w-0 max-h-32 resize-none overflow-y-auto rounded-2xl bg-secondary px-3 py-2.5 mb-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />

          {/* Fila fija de abajo: accesos directos a la izquierda, enviar a la derecha */}
          <div className="flex w-full max-w-full items-center justify-between gap-1">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setMode((m) => (m === "note" ? "text" : "note"))}
                className={cn(
                  "p-2.5 rounded-full transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center",
                  mode === "note" ? "bg-chat-note text-foreground" : "text-muted-foreground hover:bg-secondary",
                )}
                title="Nota interna"
                type="button"
                disabled={disabled || pendingImages.length > 0}
              >
                <StickyNote className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowQuickReply(true)}
                className="p-2.5 rounded-full transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:bg-secondary"
                title="Respuestas rapidas"
                type="button"
                disabled={disabled}
              >
                <Zap className="w-5 h-5" />
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
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />

              {onSendGalleryImage && (
                <button
                  onClick={() => setShowGallery(true)}
                  className="p-2.5 rounded-full transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:bg-secondary"
                  title="Galeria"
                  type="button"
                  disabled={disabled}
                >
                  <Images className="w-5 h-5" />
                </button>
              )}
            </div>

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
      </div>

      <QuickReplySheet open={showQuickReply} onClose={() => setShowQuickReply(false)} onSelect={handleSelectQuickReply} />

      {onSendGalleryImage && <GallerySheet open={showGallery} onClose={() => setShowGallery(false)} onSelect={handleSelectGalleryImages} />}
    </>
  );
}
