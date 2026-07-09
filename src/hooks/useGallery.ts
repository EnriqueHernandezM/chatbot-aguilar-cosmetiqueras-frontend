import { useCallback, useEffect, useState } from "react";
import { getGallery } from "@/api/galleryApi";
import { GalleryItem } from "@/modules/types";

export function useGallery(options: { enabled: boolean }): {
  items: GalleryItem[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
} {
  const { enabled } = options;
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGallery = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextItems = await getGallery();
      setItems(nextItems);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "No se pudieron cargar las imagenes de la galeria";
      setItems([]);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void loadGallery();
  }, [enabled, loadGallery]);

  const reload = useCallback(() => {
    void loadGallery();
  }, [loadGallery]);

  return { items, isLoading, error, reload };
}
