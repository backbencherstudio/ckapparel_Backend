/*
  Warnings:

  - The values [CROSS_TRAINING] on the enum `ChallengeCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ChallengeCategory_new" AS ENUM ('RUNNING', 'CYCLING', 'SWIMMING', 'HIIT', 'OTHER');
ALTER TABLE "challenges" ALTER COLUMN "category" TYPE "ChallengeCategory_new" USING ("category"::text::"ChallengeCategory_new");
ALTER TABLE "sponsorships" ALTER COLUMN "challenge_category" TYPE "ChallengeCategory_new" USING ("challenge_category"::text::"ChallengeCategory_new");
ALTER TYPE "ChallengeCategory" RENAME TO "ChallengeCategory_old";
ALTER TYPE "ChallengeCategory_new" RENAME TO "ChallengeCategory";
DROP TYPE "ChallengeCategory_old";
COMMIT;
