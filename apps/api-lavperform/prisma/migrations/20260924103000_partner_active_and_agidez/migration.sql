ALTER TABLE "Partner" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

INSERT INTO "Partner" (id, name, "partnerSlug", "createdAt", "active")
VALUES ('partner-agidez', 'Agidez', 'AGIDEZ', NOW(), true)
ON CONFLICT ("partnerSlug") DO NOTHING;
