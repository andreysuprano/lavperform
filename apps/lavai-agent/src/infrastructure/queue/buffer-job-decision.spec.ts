import { decideBufferJob } from './buffer-job-decision';

describe('decideBufferJob', () => {
  it('pausa devolve reschedule mesmo com itens e takeover', () => {
    expect(decideBufferJob({ paused: true, takeover: true, itemCount: 3 })).toBe('reschedule');
  });

  it('sem pausa e com takeover devolve discard', () => {
    expect(decideBufferJob({ paused: false, takeover: true, itemCount: 2 })).toBe('discard');
  });

  it('sem pausa, sem takeover e com itens devolve batch', () => {
    expect(decideBufferJob({ paused: false, takeover: false, itemCount: 1 })).toBe('batch');
  });

  it('com os três ausentes devolve resume', () => {
    expect(decideBufferJob({ paused: false, takeover: false, itemCount: 0 })).toBe('resume');
  });
});
