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

export interface PromptProposal {
  summary: string;
  changes: Partial<PromptDocument>;
  baseUpdatedAt?: string;
  sheetUpdatedAt?: string;
  answerKey?: string;
  answerValue?: string;
}
