/*
  Warnings:

  - You are about to drop the column `userId` on the `challenges` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlanCategory" AS ENUM ('RUNNING', 'CYCLING', 'SWIMMING', 'HIIT');

-- CreateEnum
CREATE TYPE "TrainingPlansCategory" AS ENUM ('Beginner', 'Intermediate', 'Advanced');

-- DropForeignKey
ALTER TABLE "challenges" DROP CONSTRAINT "challenges_userId_fkey";

-- AlterTable
ALTER TABLE "challenges" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "plan_types" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "plan_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_plans" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" SMALLINT DEFAULT 1,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "distance" DECIMAL(10,2),
    "resource_url" TEXT,
    "route_url" TEXT,
    "planTypeId" TEXT NOT NULL,
    "category" "PlanCategory" NOT NULL,
    "trainingPlansCategory" "TrainingPlansCategory",

    CONSTRAINT "support_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_types_name_idx" ON "plan_types"("name");

-- AddForeignKey
ALTER TABLE "support_plans" ADD CONSTRAINT "support_plans_planTypeId_fkey" FOREIGN KEY ("planTypeId") REFERENCES "plan_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
