/*
  Warnings:

  - The values [GARMIN,APPLE_HEALTH] on the enum `FitnessProvider` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `counted_distance_km` on the `challenge_activity_links` table. All the data in the column will be lost.
  - You are about to drop the column `counted_duration_min` on the `challenge_activity_links` table. All the data in the column will be lost.
  - You are about to drop the column `counted_elevation_m` on the `challenge_activity_links` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `challenge_activity_links` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `challenge_checkpoint_progresses` table. All the data in the column will be lost.
  - You are about to drop the column `distance_km` on the `challenge_checkpoint_progresses` table. All the data in the column will be lost.
  - You are about to drop the column `duration_min` on the `challenge_checkpoint_progresses` table. All the data in the column will be lost.
  - You are about to drop the column `elevation_m` on the `challenge_checkpoint_progresses` table. All the data in the column will be lost.
  - You are about to drop the column `distance_target_km` on the `challenge_checkpoints` table. All the data in the column will be lost.
  - You are about to drop the column `duration_target_min` on the `challenge_checkpoints` table. All the data in the column will be lost.
  - You are about to drop the column `elevation_target_m` on the `challenge_checkpoints` table. All the data in the column will be lost.
  - You are about to drop the column `unlock_after_sequence` on the `challenge_checkpoints` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `challenge_journey_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entry_key` on the `challenge_journey_logs` table. All the data in the column will be lost.
  - You are about to drop the column `entry_type` on the `challenge_journey_logs` table. All the data in the column will be lost.
  - You are about to drop the column `metric_delta_distance_km` on the `challenge_journey_logs` table. All the data in the column will be lost.
  - You are about to drop the column `metric_delta_duration_min` on the `challenge_journey_logs` table. All the data in the column will be lost.
  - You are about to drop the column `metric_delta_elevation_m` on the `challenge_journey_logs` table. All the data in the column will be lost.
  - You are about to drop the column `snapshot_progress_percent` on the `challenge_journey_logs` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `challenge_journey_logs` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `challenge_leaderboards` table. All the data in the column will be lost.
  - You are about to drop the column `distance_km` on the `challenge_leaderboards` table. All the data in the column will be lost.
  - You are about to drop the column `duration_min` on the `challenge_leaderboards` table. All the data in the column will be lost.
  - You are about to drop the column `elevation_m` on the `challenge_leaderboards` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `challenge_leaderboards` table. All the data in the column will be lost.
  - You are about to drop the column `distance_km` on the `challenge_participations` table. All the data in the column will be lost.
  - You are about to drop the column `duration_min` on the `challenge_participations` table. All the data in the column will be lost.
  - You are about to drop the column `elevation_m` on the `challenge_participations` table. All the data in the column will be lost.
  - You are about to drop the column `moving_time_sec` on the `challenge_participations` table. All the data in the column will be lost.
  - You are about to drop the column `paused_at` on the `challenge_participations` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `challenge_participations` table. All the data in the column will be lost.
  - The `status` column on the `challenge_participations` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `chat_enabled` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `checkpoint` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `distance` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `elevation` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `end_at` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `finishers` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `in_progress` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `metric_type` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `participants` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `reward` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `start_at` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `target_distance_km` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `target_duration_min` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `target_elevation_m` on the `challenges` table. All the data in the column will be lost.
  - You are about to drop the column `started_at` on the `synced_activities` table. All the data in the column will be lost.
  - Added the required column `metric_targets` to the `challenge_checkpoints` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `challenge_journey_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `challenge_id` on table `challenge_journey_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `participation_id` on table `challenge_journey_logs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `challenge_id` on table `challenge_leaderboards` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `challenge_leaderboards` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_id` on table `challenge_participations` required. This step will fail if there are existing NULL values in that column.
  - Made the column `challenge_id` on table `challenge_participations` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `ends_at` to the `challenges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `starts_at` to the `challenges` table without a default value. This is not possible if the table is not empty.
  - Made the column `title` on table `challenges` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `path` to the `challenges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `challenges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `difficulty` to the `challenges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `activity_date` to the `synced_activities` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ChallengePath" AS ENUM ('ELITE_ATHLETE', 'MONTHLY_CHALLENGE', 'VIRTUAL_ADVENTURE', 'COMMUNITY_CHALLENGE');

-- CreateEnum
CREATE TYPE "ChallengeCategory" AS ENUM ('RUNNING', 'CYCLING', 'SWIMMING', 'HIIT', 'CROSS_TRAINING', 'OTHER');

-- CreateEnum
CREATE TYPE "ChallengeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'CHALLENGING', 'EXPERT', 'EXTREME');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('JOINED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'ABANDONED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('DISTANCE_KM', 'ELEVATION_M', 'DURATION_MIN', 'CALORIES');

-- AlterEnum
BEGIN;
CREATE TYPE "FitnessProvider_new" AS ENUM ('STRAVA', 'MANUAL');
ALTER TABLE "challenge_participations" ALTER COLUMN "source_provider" TYPE "FitnessProvider_new" USING ("source_provider"::text::"FitnessProvider_new");
ALTER TABLE "challenge_leaderboards" ALTER COLUMN "source_provider" TYPE "FitnessProvider_new" USING ("source_provider"::text::"FitnessProvider_new");
ALTER TABLE "challenge_journey_logs" ALTER COLUMN "source_provider" TYPE "FitnessProvider_new" USING ("source_provider"::text::"FitnessProvider_new");
ALTER TABLE "challenge_checkpoint_progresses" ALTER COLUMN "source_provider" TYPE "FitnessProvider_new" USING ("source_provider"::text::"FitnessProvider_new");
ALTER TABLE "external_connections" ALTER COLUMN "provider" TYPE "FitnessProvider_new" USING ("provider"::text::"FitnessProvider_new");
ALTER TABLE "synced_activities" ALTER COLUMN "provider" TYPE "FitnessProvider_new" USING ("provider"::text::"FitnessProvider_new");
ALTER TYPE "FitnessProvider" RENAME TO "FitnessProvider_old";
ALTER TYPE "FitnessProvider_new" RENAME TO "FitnessProvider";
DROP TYPE "FitnessProvider_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "challenge_journey_logs" DROP CONSTRAINT "challenge_journey_logs_participation_id_fkey";

-- DropIndex
DROP INDEX "challenge_activity_links_participation_id_activity_id_key";

-- DropIndex
DROP INDEX "challenge_checkpoints_challenge_id_sequence_idx";

-- DropIndex
DROP INDEX "synced_activities_user_id_started_at_idx";

-- AlterTable
ALTER TABLE "challenge_activity_links" DROP COLUMN "counted_distance_km",
DROP COLUMN "counted_duration_min",
DROP COLUMN "counted_elevation_m",
DROP COLUMN "deleted_at",
ADD COLUMN     "counted_metrics" JSONB;

-- AlterTable
ALTER TABLE "challenge_checkpoint_progresses" DROP COLUMN "deleted_at",
DROP COLUMN "distance_km",
DROP COLUMN "duration_min",
DROP COLUMN "elevation_m",
ADD COLUMN     "metric_values" JSONB;

-- AlterTable
ALTER TABLE "challenge_checkpoints" DROP COLUMN "distance_target_km",
DROP COLUMN "duration_target_min",
DROP COLUMN "elevation_target_m",
DROP COLUMN "unlock_after_sequence",
ADD COLUMN     "metric_targets" JSONB NOT NULL,
ADD COLUMN     "reward_image" TEXT,
ADD COLUMN     "unlock_after_checkpoint_seq" INTEGER;

-- AlterTable
ALTER TABLE "challenge_journey_logs" DROP COLUMN "deleted_at",
DROP COLUMN "entry_key",
DROP COLUMN "entry_type",
DROP COLUMN "metric_delta_distance_km",
DROP COLUMN "metric_delta_duration_min",
DROP COLUMN "metric_delta_elevation_m",
DROP COLUMN "snapshot_progress_percent",
DROP COLUMN "updated_at",
ADD COLUMN     "event_type" TEXT,
ADD COLUMN     "metric_changes" JSONB,
ADD COLUMN     "progress_snapshot" DECIMAL(65,30),
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "challenge_id" SET NOT NULL,
ALTER COLUMN "participation_id" SET NOT NULL,
ALTER COLUMN "source_provider" SET DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "challenge_leaderboards" DROP COLUMN "deleted_at",
DROP COLUMN "distance_km",
DROP COLUMN "duration_min",
DROP COLUMN "elevation_m",
DROP COLUMN "progress",
ADD COLUMN     "metric_values" JSONB,
ALTER COLUMN "challenge_id" SET NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "challenge_participations" DROP COLUMN "distance_km",
DROP COLUMN "duration_min",
DROP COLUMN "elevation_m",
DROP COLUMN "moving_time_sec",
DROP COLUMN "paused_at",
DROP COLUMN "progress",
ADD COLUMN     "metric_values" JSONB,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "challenge_id" SET NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ParticipationStatus" NOT NULL DEFAULT 'JOINED';

-- AlterTable
ALTER TABLE "challenges" DROP COLUMN "chat_enabled",
DROP COLUMN "checkpoint",
DROP COLUMN "distance",
DROP COLUMN "duration",
DROP COLUMN "elevation",
DROP COLUMN "end_at",
DROP COLUMN "finishers",
DROP COLUMN "in_progress",
DROP COLUMN "metric_type",
DROP COLUMN "participants",
DROP COLUMN "reward",
DROP COLUMN "start_at",
DROP COLUMN "target_distance_km",
DROP COLUMN "target_duration_min",
DROP COLUMN "target_elevation_m",
ADD COLUMN     "enable_chat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "ends_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "participants_completed" INTEGER DEFAULT 0,
ADD COLUMN     "participants_joined" INTEGER DEFAULT 0,
ADD COLUMN     "reward_description" TEXT,
ADD COLUMN     "reward_title" TEXT,
ADD COLUMN     "starts_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "title" SET NOT NULL,
ALTER COLUMN "require_device_connection" SET DEFAULT true,
DROP COLUMN "path",
ADD COLUMN     "path" "ChallengePath" NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" "ChallengeCategory" NOT NULL,
DROP COLUMN "difficulty",
ADD COLUMN     "difficulty" "ChallengeDifficulty" NOT NULL;

-- AlterTable
ALTER TABLE "synced_activities" DROP COLUMN "started_at",
ADD COLUMN     "activity_date" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "ChallengeAttemptStatus";

-- DropEnum
DROP TYPE "ChallengeCategories";

-- DropEnum
DROP TYPE "ChallengeDefficulty";

-- DropEnum
DROP TYPE "ChallengeMetricType";

-- DropEnum
DROP TYPE "ChallengePaths";

-- CreateTable
CREATE TABLE "challenge_path_configs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "challenge_id" TEXT NOT NULL,
    "config_data" JSONB NOT NULL,

    CONSTRAINT "challenge_path_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_metrics" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "challenge_id" TEXT NOT NULL,
    "metric_type" "MetricType" NOT NULL,
    "sequence" INTEGER NOT NULL,
    "target_value" DECIMAL(65,30) NOT NULL,
    "min_threshold" DECIMAL(65,30),
    "is_required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "challenge_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenge_path_configs_challenge_id_key" ON "challenge_path_configs"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_metrics_challenge_id_sequence_idx" ON "challenge_metrics"("challenge_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_metrics_challenge_id_metric_type_key" ON "challenge_metrics"("challenge_id", "metric_type");

-- CreateIndex
CREATE INDEX "challenge_checkpoints_challenge_id_idx" ON "challenge_checkpoints"("challenge_id");

-- CreateIndex
CREATE INDEX "challenge_participations_challenge_id_status_idx" ON "challenge_participations"("challenge_id", "status");

-- CreateIndex
CREATE INDEX "challenge_participations_user_id_status_idx" ON "challenge_participations"("user_id", "status");

-- CreateIndex
CREATE INDEX "challenges_path_is_active_idx" ON "challenges"("path", "is_active");

-- CreateIndex
CREATE INDEX "challenges_starts_at_ends_at_idx" ON "challenges"("starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "synced_activities_user_id_activity_date_idx" ON "synced_activities"("user_id", "activity_date");

-- AddForeignKey
ALTER TABLE "challenge_path_configs" ADD CONSTRAINT "challenge_path_configs_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_metrics" ADD CONSTRAINT "challenge_metrics_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_journey_logs" ADD CONSTRAINT "challenge_journey_logs_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "challenge_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
