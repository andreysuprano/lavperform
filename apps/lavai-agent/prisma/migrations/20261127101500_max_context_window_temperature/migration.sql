-- Janela de contexto, tokens da resposta e temperatura no teto de todo agente já criado.
UPDATE "agent_memory_configs"
SET "window_size" = 100;

UPDATE "agent_model_configs"
SET "temperature" = 0.3,
    "max_tokens" = 16384;

ALTER TABLE "agent_memory_configs"
  ALTER COLUMN "window_size" SET DEFAULT 100;

ALTER TABLE "agent_model_configs"
  ALTER COLUMN "temperature" SET DEFAULT 0.3;

ALTER TABLE "agent_model_configs"
  ALTER COLUMN "max_tokens" SET DEFAULT 16384;
