-- CreateTable
CREATE TABLE "agent_notification_configs" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "help_notification_enabled" BOOLEAN NOT NULL DEFAULT false,
    "help_notification_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_notification_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_notification_configs_agent_id_key" ON "agent_notification_configs"("agent_id");

-- AddForeignKey
ALTER TABLE "agent_notification_configs" ADD CONSTRAINT "agent_notification_configs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
