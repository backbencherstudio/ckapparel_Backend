/*
  Warnings:

  - You are about to drop the column `banner_image` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `ends_at` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `hero_image` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `starts_at` on the `challenges` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "challenges_slug_key";

-- DropIndex
DROP INDEX "challenges_starts_at_ends_at_idx";

-- AlterTable
ALTER TABLE "challenges" DROP COLUMN "banner_image",
DROP COLUMN "ends_at",
DROP COLUMN "hero_image",
DROP COLUMN "slug",
DROP COLUMN "starts_at";
