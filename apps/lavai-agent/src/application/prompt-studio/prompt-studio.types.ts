export const DO_NOT_INVENT =
  'A unidade não informou isso. Não invente. Diga que não sabe e ofereça passar para um atendente.';

export type VoiceTone = 'FORMAL' | 'FRIENDLY' | 'NEUTRAL' | 'EMPATHETIC' | 'TECHNICAL';
export type CommunicationStyle = 'CONCISE' | 'DETAILED' | 'BALANCED' | 'INSTRUCTIVE';

export interface QuestionnaireAnswers {
  services: string;
  focus: string;
  mustNotPromise: string;
  hoursAndDeadline?: string;
  pricing?: string;
  handoff?: string;
  voiceTone: VoiceTone;
  communicationStyle: CommunicationStyle;
}

export interface PromptDocument {
  contextPrompt: string;
  systemPrompt: string;
  behaviorGuidelines: string;
  guardrails: string;
}

export type PromptField = keyof PromptDocument;

/** Resposta do modelo ao chat de ajuste, antes de ser aplicada ao contexto. */
export interface PromptEditRequest {
  summary: string;
  replacements: Array<{ before: string; after: string }>;
  addition: string;
  answerKey?: string;
  answerValue?: string;
}

export interface PromptProposal {
  summary: string;
  /** O chat de ajuste só altera o contexto de negócio. */
  changes: Pick<PromptDocument, 'contextPrompt'>;
  /** O que sai e o que entra, para a pessoa conferir antes de aceitar. */
  edits: Array<{ before: string; after: string }>;
  baseUpdatedAt?: string;
  sheetUpdatedAt?: string;
  answerKey?: string;
  answerValue?: string;
}
