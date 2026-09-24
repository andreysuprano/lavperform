UPDATE "Partner"
SET name = 'Hybex', "partnerSlug" = 'HYBEX'
WHERE "partnerSlug" = 'AGIDEZ'
  AND NOT EXISTS (
    SELECT 1 FROM "Partner" existing WHERE existing."partnerSlug" = 'HYBEX'
  );
