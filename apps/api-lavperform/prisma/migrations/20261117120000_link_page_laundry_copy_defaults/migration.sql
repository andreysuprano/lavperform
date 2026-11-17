-- Default e dados legados da Minha Página (contexto lavanderia)
ALTER TABLE "public"."LinkPage" ALTER COLUMN "biography" SET DEFAULT 'A melhor experiência em lavanderia que você pode ter hoje! 🧺';

UPDATE "public"."LinkPage"
SET "biography" = 'A melhor experiência em lavanderia que você pode ter hoje! 🧺'
WHERE "biography" IN (
  'A melhor experiência gastronômica que você pode ter hoje! 👨🏻‍🍳',
  'A melhor experiência gastronômica!'
);

UPDATE "public"."LinkPage"
SET "coverImage" = NULL
WHERE "coverImage" LIKE '%institucional%2Frestaurant.jpg%'
   OR "coverImage" LIKE '%institucional/restaurant.jpg%';