export function takeSseEvents(buffer: string): { events: unknown[]; rest: string } {
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  const events: unknown[] = []
  for (const part of parts) {
    const data = part
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
    if (!data) continue
    events.push(JSON.parse(data))
  }
  return { events, rest }
}
