import { useState } from "react";
import { X, Images } from "lucide-react";
import { useGallery } from "@/hooks/useGallery";
import { GalleryItem } from "@/modules/types";

interface GallerySheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (item: GalleryItem, caption?: string) => Promise<void>;
}

export function GallerySheet({ open, onClose, onConfirm }: GallerySheetProps) {
  // useGallery solo debe pedir datos cuando `open` es true (ver contrato en el prompt de Codex).
  const { items, isLoading, error, reload } = useGallery({ enabled: open });
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [caption, setCaption] = useState("");
  const [isSending, setIsSending] = useState(false);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    setSelectedItem(null);
    setCaption("");
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedItem || isSending) {
      return;
    }

    setIsSending(true);

    try {
      await onConfirm(selectedItem, caption.trim() || undefined);
      setSelectedItem(null);
      setCaption("");
      onClose();
    } catch {
      // Error toast se maneja arriba; mantenemos la seleccion para poder reintentar.
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-foreground/40 animate-fade-in" onClick={handleClose} />

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col rounded-t-2xl border-t border-border bg-card shadow-lg animate-slide-up">
        <div className="flex shrink-0 flex-col items-center border-b border-border px-4 pb-2 pt-3">
          <div className="mb-3 h-1 w-10 rounded-full bg-muted" />
          <div className="flex w-full items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Images className="h-4 w-4 text-primary" />
              Galeria
            </h3>
            <button onClick={handleClose} className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full p-2 hover:bg-secondary" type="button">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3" style={{ WebkitOverflowScrolling: "touch" }}>
          {selectedItem ? (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-xl border border-border bg-secondary">
                <img src={selectedItem.url} alt={selectedItem.title || "Imagen de galeria"} className="max-h-64 w-full object-contain" />
              </div>

              {selectedItem.title && <p className="text-xs text-muted-foreground">{selectedItem.title}</p>}

              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Agregar un mensaje (opcional)"
                className="w-full rounded-2xl bg-secondary px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              <div className="flex gap-2">
                <button onClick={() => setSelectedItem(null)} className="flex-1 rounded-xl bg-secondary px-3.5 py-3 text-sm font-medium text-foreground hover:bg-accent" type="button" disabled={isSending}>
                  Elegir otra
                </button>
                <button onClick={handleConfirm} className="flex-1 rounded-xl bg-primary px-3.5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50" type="button" disabled={isSending}>
                  {isSending ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando galeria...</p>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-muted-foreground">No se pudo cargar la galeria.</p>
              <button onClick={reload} className="rounded-xl bg-secondary px-4 py-2 text-sm font-medium text-foreground hover:bg-accent" type="button">
                Reintentar
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Aun no hay imagenes guardadas en la galeria.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item) => (
                <button key={item.id} onClick={() => setSelectedItem(item)} className="relative overflow-hidden rounded-xl border border-border bg-secondary" type="button">
                  <img src={item.url} alt={item.title || "Imagen de galeria"} className="h-24 w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
