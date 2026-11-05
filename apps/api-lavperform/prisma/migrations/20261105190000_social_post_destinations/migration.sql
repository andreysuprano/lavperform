-- Destinos de publicação separados do formato do post (carrossel, vídeo, imagem).
ALTER TABLE "social_post_drafts" ADD COLUMN "destinations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
