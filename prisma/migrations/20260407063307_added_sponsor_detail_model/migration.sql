/*
  Warnings:

  - You are about to drop the column `sponsor_id` on the `sponsorships` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sponsorships" DROP CONSTRAINT "sponsorships_sponsor_id_fkey";

-- AlterTable
ALTER TABLE "sponsorships" DROP COLUMN "sponsor_id";

-- CreateTable
CREATE TABLE "sponsor_details" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sponsorship_id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone_number" TEXT,
    "amount" DECIMAL(15,2),
    "message" TEXT,

    CONSTRAINT "sponsor_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsor_details_sponsorship_id_idx" ON "sponsor_details"("sponsorship_id");

-- AddForeignKey
ALTER TABLE "sponsor_details" ADD CONSTRAINT "sponsor_details_sponsorship_id_fkey" FOREIGN KEY ("sponsorship_id") REFERENCES "sponsorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
