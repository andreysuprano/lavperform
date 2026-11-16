export type ChannelResult = {
  ok: boolean;
  externalId?: string;
  error?: string;
};

export function channelLabel(channel: string): string {
  if (channel === 'FACEBOOK') return 'Facebook';
  if (channel === 'INSTAGRAM') return 'Instagram';
  if (channel === 'GOOGLE_BUSINESS') return 'Google';
  return channel;
}

export function decidePublishOutcome(input: {
  channels: string[];
  attempt: number;
  maxAttempts: number;
  previous: Record<string, ChannelResult>;
  fresh: Array<ChannelResult & { channel: string }>;
}): {
  action: 'published' | 'failed' | 'retry';
  channelResults: Record<string, ChannelResult>;
  lastError: string | null;
} {
  const channelResults: Record<string, ChannelResult> = { ...input.previous };
  for (const item of input.fresh) {
    channelResults[item.channel] = {
      ok: item.ok,
      externalId: item.externalId,
      error: item.error,
    };
  }

  const failures = input.channels.filter(
    (channel) => !channelResults[channel]?.ok,
  );
  if (failures.length === 0) {
    return { action: 'published', channelResults, lastError: null };
  }

  const lastError = failures
    .map((channel) => {
      const error = channelResults[channel]?.error || 'falha sem detalhe';
      return `${channelLabel(channel)}: ${error}`;
    })
    .join(' | ');

  if (input.attempt >= input.maxAttempts) {
    return { action: 'failed', channelResults, lastError };
  }
  return { action: 'retry', channelResults, lastError };
}

export class PublishRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishRetryError';
  }
}
