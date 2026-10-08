const HTML_TAG = /<\/?[a-z][^>\n]*>/gi

export function markdownForDisplay(source: string): string {
  return source.replace(HTML_TAG, '')
}
