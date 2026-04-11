-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('OPEN', 'CLOSED', 'PENDING', 'DECLINED');

-- CreateEnum
CREATE TYPE "NeedCategory" AS ENUM ('FOOTWEAR', 'NUTRITION', 'TRANSPORTATION', 'SUPPLIMENTS', 'OTHER');

-- CreateTable
CREATE TABLE "sponsorships" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "funding_goal" DECIMAL(15,2),
    "amount_raised" DECIMAL(15,2),
    "challenge_category" "ChallengeCategory",
    "creator_id" TEXT,
    "sponsor_id" TEXT,

    CONSTRAINT "sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_needs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sponsorship_Id" TEXT NOT NULL,
    "need_category" "NeedCategory",
    "need_description" TEXT,

    CONSTRAINT "sponsorship_needs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsorship_needs_sponsorship_Id_idx" ON "sponsorship_needs"("sponsorship_Id");

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_needs" ADD CONSTRAINT "sponsorship_needs_sponsorship_Id_fkey" FOREIGN KEY ("sponsorship_Id") REFERENCES "sponsorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
