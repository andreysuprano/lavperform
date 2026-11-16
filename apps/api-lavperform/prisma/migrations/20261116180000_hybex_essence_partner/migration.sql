INSERT INTO "Partner" ("id", "name", "partnerSlug", "createdAt", "active")
SELECT 'partner-hybex-essence', 'Hybex Essence', 'HYBEX_ESSENCE', NOW(), true
WHERE NOT EXISTS (
  SELECT 1 FROM "Partner" WHERE "partnerSlug" = 'HYBEX_ESSENCE'
);