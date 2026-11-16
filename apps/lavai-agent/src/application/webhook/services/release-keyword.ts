export function matchesReleaseKeyword(
  text: string,
  keyword: string | null | undefined,
): boolean {
  const needle = keyword?.trim().toLowerCase() ?? '';
  if (!needle) return false;
  return text.trim().toLowerCase() === needle;
}
