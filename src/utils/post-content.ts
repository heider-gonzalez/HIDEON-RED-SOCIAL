export function normalizePostContent(raw: string | null | undefined): string {
  if (!raw) return '';

  return String(raw)
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");
}
