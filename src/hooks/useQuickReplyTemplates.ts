import { useEffect, useState } from "react";
import { getQuickResponses } from "@/api/quickResponsesApi";
import { QuickReplyTemplate } from "@/modules/types";

export function useQuickReplyTemplates() {
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTemplates = async () => {
      try {
        const nextTemplates = await getQuickResponses();

        if (isMounted) {
          setTemplates(nextTemplates);
        }
      } catch {
        if (isMounted) {
          setTemplates([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  return { templates, loading };
}
