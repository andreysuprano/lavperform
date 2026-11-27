/** Acima disso o atendimento começa a variar preço, prazo e regra. */
export const AGENT_TEMPERATURE = 0.3;

/** Teto da API para a janela de mensagens. Também é o padrão de toda criação. */
export const AGENT_CONTEXT_WINDOW = 100;

/** Teto de tokens da resposta. É o máximo aceito pelo gpt-4o e pela API. */
export const AGENT_MAX_TOKENS = 16_384;

/**
 * Piso de contexto dos modelos de atendimento (gpt-4o e gpt-5, 128k).
 * O histórico ocupa o que sobra depois do sistema, da mensagem atual e da resposta.
 */
export const AGENT_MODEL_CONTEXT_TOKENS = 128_000;
