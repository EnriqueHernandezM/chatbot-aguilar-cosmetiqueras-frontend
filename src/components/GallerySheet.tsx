import { useState } from "react";
import { X, Images } from "lucide-react";
import { useGallery } from "@/hooks/useGallery";
import { GalleryItem } from "@/modules/types";

interface GallerySheetProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: GalleryItem[]) => void;
}

function getGalleryThumbnailUrl(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) {
    return url;
  }

  return url.replace("/image/upload/", "/image/upload/w_300,q_auto,f_auto/");
}

export function GallerySheet({ open, onClose, onSelect }: GallerySheetProps) {
  // useGallery solo debe pedir datos cuando `open` es true (ver contrato en el prompt de Codex).
  const { items, isLoading, error, reload } = useGallery({ enabled: open });
  const [selectedItems, setSelectedItems] = useState<GalleryItem[]>([]);

  if (!open) {
    return null;
  }

  const handleClose = () => {
    setSelectedItems([]);
    onClose();
  };

  const handleToggleSelect = (item: GalleryItem) => {
    setSelectedItems((prev) => (prev.some((selectedItem) => selectedItem.id === item.id) ? prev.filter((selectedItem) => selectedItem.id !== item.id) : [...prev, item]));
  };

  const handleDone = () => {
    if (selectedItems.length === 0) {
      return;
    }

    onSelect(selectedItems);
    setSelectedItems([]);
    onClose();
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
          {isLoading ? (
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
              {items.map((item) => {
                const isSelected = selectedItems.some((selectedItem) => selectedItem.id === item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => handleToggleSelect(item)}
                    className="relative overflow-hidden rounded-xl border border-border bg-secondary"
                    type="button"
                    aria-pressed={isSelected}
                  >
                    <img src={getGalleryThumbnailUrl(item.url)} alt={item.title || "Imagen de galeria"} className="h-24 w-full object-cover" />
                    {isSelected && (
                      <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                        {selectedItems.findIndex((selectedItem) => selectedItem.id === item.id) + 1}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <button
            onClick={handleDone}
            className="w-full rounded-xl bg-primary px-3.5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-40"
            type="button"
            disabled={selectedItems.length === 0}
          >
            {selectedItems.length > 0 ? `Listo (${selectedItems.length})` : "Listo"}
          </button>
        </div>
      </div>
    </>
  );
}
