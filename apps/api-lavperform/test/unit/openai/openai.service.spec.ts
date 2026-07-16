import { of, throwError } from 'rxjs';
import { OpenAIService } from 'src/integrations/openai/api/openai.service';

jest.mock('src/common/utils/formatters', () => ({
  formatError: () => 'formatted-error',
}));

describe('OpenAIService', () => {
  const httpService: any = {
    post: jest.fn(),
  };

  let service: OpenAIService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OpenAIService(httpService as any);
    (service as any).baseUrl = 'http://openai';
  });

  it('generates message successfully', async () => {
    httpService.post.mockReturnValue(of({ data: { text: 'hello' } }));
    const result = await service.generateMessage({ customerName: 'A', messageText: 'Hi', linkCardapio: 'url' });
    expect(result).toEqual({ text: 'hello' });
    expect(httpService.post).toHaveBeenCalled();
  });

  it('throws with formatted error when request fails', async () => {
    httpService.post.mockReturnValue(throwError(() => new Error('fail')));
    await expect(
      service.generateMessage({ customerName: 'A', messageText: 'Hi', linkCardapio: 'url' }),
    ).rejects.toThrow(/Não foi possível gerar a mensagem/);
  });
});
