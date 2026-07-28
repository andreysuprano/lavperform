-- Adiciona coluna de assinatura de mensagem na persona do agente
ALTER TABLE agent_personas ADD COLUMN IF NOT EXISTS message_signature TEXT;
