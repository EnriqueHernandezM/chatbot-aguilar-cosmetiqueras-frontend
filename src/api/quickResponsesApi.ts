import { apiFetch } from "@/api/apiClient";
import { QuickReplyTemplate } from "@/modules/types";

interface QuickResponseApiResponse {
  _id?: string;
  id?: string;
  category?: string;
  title?: string;
  content?: string;
  status?: boolean;
  order?: number;
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

function mapQuickResponse(template: QuickResponseApiResponse): QuickReplyTemplate | null {
  const id = typeof template._id === "string" ? template._id : typeof template.id === "string" ? template.id : "";
  const title = typeof template.title === "string" ? template.title.trim() : "";
  const content = typeof template.content === "string" ? template.content.trim() : "";

  if (!id || !title || !content || template.status !== true) {
    return null;
  }

  return {
    id,
    title,
    content,
    category: typeof template.category === "string" && template.category.trim() ? template.category.trim() : "Otro",
    order: typeof template.order === "number" ? template.order : Number.MAX_SAFE_INTEGER,
  };
}

export async function getQuickResponses(): Promise<QuickReplyTemplate[]> {
  const response = await apiFetch("/quick-responses");

  await assertOk(response, "No se pudieron cargar las respuestas rapidas");

  const data = await readJson<QuickResponseApiResponse[] | { data?: QuickResponseApiResponse[] }>(response);
  const templates = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  return templates
    .map(mapQuickResponse)
    .filter((template): template is QuickReplyTemplate => !!template)
    .sort((a, b) => {
      const orderDifference = (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER);

      if (orderDifference !== 0) {
        return orderDifference;
      }

      return a.title.localeCompare(b.title, "es");
    });
}
