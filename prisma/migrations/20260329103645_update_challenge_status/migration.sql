-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('ACTIVE', 'PENDING', 'COMPLETED', 'REJECTED');

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "status" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE';
