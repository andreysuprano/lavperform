export type ParsedTemplateCategoryUpdate = {
  metaTemplateId: string;
  newCategory: string;
  previousCategory?: string;
};

export function parseTemplateCategoryUpdates(
  body: unknown,
): ParsedTemplateCategoryUpdate[] {
  const root = body as { entry?: unknown };
  const entries = Array.isArray(root?.entry) ? root.entry : [];
  const parsed: ParsedTemplateCategoryUpdate[] = [];

  for (const entry of entries) {
    const changes = (entry as { changes?: unknown }).changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const row = change as { field?: unknown; value?: Record<string, unknown> };
      if (row.field !== 'template_category_update') continue;

      const value = row.value ?? {};
      const id = value.message_template_id;
      const next = value.new_category;
      if (
        (typeof id !== 'string' && typeof id !== 'number') ||
        typeof next !== 'string' ||
        !next.trim()
      ) {
        continue;
      }

      const previous = value.previous_category;
      parsed.push({
        metaTemplateId: String(id),
        newCategory: next.trim(),
        ...(typeof previous === 'string' && previous.trim()
          ? { previousCategory: previous.trim() }
          : {}),
      });
    }
  }

  return parsed;
}
