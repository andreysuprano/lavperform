-- O prazo padrão de 60 minutos deixava o encerramento tarde demais.
-- Quem ainda está nesse valor passa para 20. Outro prazo escolhido permanece.
UPDATE "agent_journey_configs"
SET "idle_close_minutes" = 20
WHERE "idle_close_minutes" = 60;

ALTER TABLE "agent_journey_configs"
  ALTER COLUMN "idle_close_minutes" SET DEFAULT 20;
