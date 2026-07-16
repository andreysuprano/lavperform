let pendingCount = 0
const listeners = new Set<() => void>()

export function getPendingRequestCount(): number {
  return pendingCount
}

export function subscribePendingRequests(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

export function beginPendingRequest(): void {
  pendingCount += 1
  notifyListeners()
}

export function endPendingRequest(): void {
  pendingCount = Math.max(0, pendingCount - 1)
  notifyListeners()
}
