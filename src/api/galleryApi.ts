import { apiFetch } from "@/api/apiClient";
import { GalleryItem } from "@/modules/types";

interface GalleryImageApiResponse {
  url?: string;
  imageUrl?: string;
}

interface GalleryItemApiResponse {
  _id?: string;
  id?: string;
  url?: string;
  imageUrl?: string;
  image?: string | GalleryImageApiResponse | null;
  title?: string;
  caption?: string;
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

function getNestedImageUrl(raw: GalleryItemApiResponse): string {
  if (typeof raw.image === "string") {
    return raw.image;
  }

  if (raw.image && typeof raw.image === "object") {
    if (typeof raw.image.url === "string") {
      return raw.image.url;
    }

    if (typeof raw.image.imageUrl === "string") {
      return raw.image.imageUrl;
    }
  }

  return "";
}

function mapGalleryItem(raw: GalleryItemApiResponse): GalleryItem {
  const url =
    typeof raw.url === "string"
      ? raw.url
      : typeof raw.imageUrl === "string"
        ? raw.imageUrl
        : getNestedImageUrl(raw);
  const id = typeof raw.id === "string" ? raw.id : typeof raw._id === "string" ? raw._id : url;
  const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : undefined;
  const caption = typeof raw.caption === "string" && raw.caption.trim() ? raw.caption.trim() : undefined;

  return {
    id,
    url,
    title,
    caption,
  };
}

export async function getGallery(): Promise<GalleryItem[]> {
  const response = await apiFetch("/gallery");

  await assertOk(response, "No se pudieron cargar las imagenes de la galeria");

  const data = await readJson<GalleryItemApiResponse[] | { data?: GalleryItemApiResponse[] }>(response);
  const items = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  return items.map(mapGalleryItem).filter((item) => item.id && item.url);
}
