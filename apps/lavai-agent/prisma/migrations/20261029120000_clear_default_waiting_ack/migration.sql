-- A saudação padrão estava saindo para todos os clientes.
-- Quem não escreveu uma frase própria deixa de receber esse texto.
UPDATE "agent_journey_configs"
SET
  "waiting_ack_message" = '',
  "waiting_ack_enabled" = false
WHERE "waiting_ack_message" = 'Olá, já estou te atendendo, um momento.';

ALTER TABLE "agent_journey_configs"
  ALTER COLUMN "waiting_ack_message" SET DEFAULT '',
  ALTER COLUMN "waiting_ack_enabled" SET DEFAULT false;
