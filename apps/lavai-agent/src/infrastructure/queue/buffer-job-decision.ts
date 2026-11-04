export type BufferJobDecision = 'reschedule' | 'discard' | 'batch' | 'resume';

export function decideBufferJob(input: {
  paused: boolean;
  takeover: boolean;
  itemCount: number;
}): BufferJobDecision {
  if (input.paused) return 'reschedule';
  if (input.takeover) return 'discard';
  if (input.itemCount > 0) return 'batch';
  return 'resume';
}
