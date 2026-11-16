INSERT INTO "Partner" ("id", "name", "partnerSlug", "createdAt", "active")
SELECT '7f3a2c10-8b4e-4d6a-9c1e-0a5b6c7d8e9f', 'Hybex Essence', 'HYBEX_ESSENCE', NOW(), true
WHERE NOT EXISTS (
  SELECT 1 FROM "Partner" WHERE "partnerSlug" = 'HYBEX_ESSENCE'
);