import { LavaiAgentApiService, OverAgentApiService } from './over-agent-api.service';

describe('LavaiAgentApiService', () => {
  it('mantém OverAgentApiService como alias retrocompatível', () => {
    expect(OverAgentApiService.prototype).toBe(LavaiAgentApiService.prototype);
  });
});
