ALTER TABLE "agent_journey_configs"
  ADD COLUMN "waiting_ack_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "waiting_ack_message" TEXT NOT NULL DEFAULT 'Olá, já estou te atendendo, um momento.',
  ADD COLUMN "human_release_keyword" TEXT NOT NULL DEFAULT '#ia',
  ADD COLUMN "idle_close_enabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "idle_close_minutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "idle_close_message" TEXT NOT NULL DEFAULT 'Vou encerrar este atendimento por falta de retorno. Quando precisar, é só enviar uma nova mensagem.';
