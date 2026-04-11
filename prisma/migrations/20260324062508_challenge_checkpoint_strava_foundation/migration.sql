-- CreateEnum
CREATE TYPE "ChallengePaths" AS ENUM ('Elite_Athlete', 'Monthly_Challenges', 'Virtual_Adventures', 'Community_Challenges');

-- CreateEnum
CREATE TYPE "ChallengeCategories" AS ENUM ('Running', 'Cycling', 'Swimming', 'HIIT', 'Other');

-- CreateEnum
CREATE TYPE "ChallengeDefficulty" AS ENUM ('Hard', 'Medium', 'Easy', 'Challenging', 'Expert', 'Extreme');

-- CreateEnum
CREATE TYPE "ChallengeMetricType" AS ENUM ('DISTANCE_KM', 'ELEVATION_M', 'DURATION_MIN', 'MIXED');

-- CreateEnum
CREATE TYPE "ChallengeAttemptStatus" AS ENUM ('JOINED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "CheckpointStatus" AS ENUM ('LOCKED', 'ACTIVE', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FitnessProvider" AS ENUM ('STRAVA', 'GARMIN', 'APPLE_HEALTH', 'MANUAL');

-- CreateEnum
CREATE TYPE "SyncedActivityStatus" AS ENUM ('PENDING', 'PROCESSED', 'IGNORED', 'FAILED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "flag" TEXT;

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "slug" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "hero_image" TEXT,
    "banner_image" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "start_at" TIMESTAMP(3),
    "end_at" TIMESTAMP(3),
    "metric_type" "ChallengeMetricType" DEFAULT 'MIXED',
    "target_distance_km" DECIMAL(65,30),
    "target_elevation_m" DECIMAL(65,30),
    "target_duration_min" INTEGER,
    "distance" DECIMAL(65,30),
    "elevation" DECIMAL(65,30),
    "duration" INTEGER,
    "checkpoint" TEXT,
    "require_device_connection" BOOLEAN NOT NULL DEFAULT false,
    "allow_manual_submission" BOOLEAN NOT NULL DEFAULT true,
    "chat_enabled" BOOLEAN NOT NULL DEFAULT true,
    "participants" INTEGER DEFAULT 0,
    "in_progress" INTEGER DEFAULT 0,
    "finishers" INTEGER DEFAULT 0,
    "max_participants" INTEGER,
    "path" "ChallengePaths",
    "category" "ChallengeCategories",
    "difficulty" "ChallengeDefficulty",
    "winner_id" TEXT,
    "reward" TEXT,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "challenge_id" TEXT,
    "external_connection_id" TEXT,
    "status" "ChallengeAttemptStatus" NOT NULL DEFAULT 'JOINED',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "paused_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "progress_percent" DECIMAL(65,30) DEFAULT 0,
    "distance_km" DECIMAL(65,30) DEFAULT 0,
    "elevation_m" DECIMAL(65,30) DEFAULT 0,
    "duration_min" INTEGER DEFAULT 0,
    "moving_time_sec" INTEGER DEFAULT 0,
    "active_checkpoint_seq" INTEGER DEFAULT 1,
    "source_provider" "FitnessProvider",
    "progress" DECIMAL(65,30),

    CONSTRAINT "challenge_participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_leaderboards" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "challenge_id" TEXT,
    "user_id" TEXT,
    "rank" INTEGER,
    "progress_percent" DECIMAL(65,30),
    "distance_km" DECIMAL(65,30),
    "elevation_m" DECIMAL(65,30),
    "duration_min" INTEGER,
    "finish_time_sec" INTEGER,
    "finished_at" TIMESTAMP(3),
    "source_provider" "FitnessProvider",
    "progress" DECIMAL(65,30),

    CONSTRAINT "challenge_leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_journey_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "challenge_id" TEXT,
    "participation_id" TEXT,
    "checkpoint_id" TEXT,
    "activity_id" TEXT,
    "entry_type" TEXT,
    "entry_key" TEXT,
    "message" TEXT,
    "metric_delta_distance_km" DECIMAL(65,30),
    "metric_delta_elevation_m" DECIMAL(65,30),
    "metric_delta_duration_min" INTEGER,
    "snapshot_progress_percent" DECIMAL(65,30),
    "source_provider" "FitnessProvider",
    "metadata" JSONB,

    CONSTRAINT "challenge_journey_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_checkpoints" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "challenge_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "distance_target_km" DECIMAL(65,30),
    "elevation_target_m" DECIMAL(65,30),
    "duration_target_min" INTEGER,
    "reward_title" TEXT,
    "reward_description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "unlock_after_sequence" INTEGER,
    "strava_segment_id" TEXT,

    CONSTRAINT "challenge_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_checkpoint_progresses" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "participation_id" TEXT NOT NULL,
    "checkpoint_id" TEXT NOT NULL,
    "status" "CheckpointStatus" NOT NULL DEFAULT 'LOCKED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "distance_km" DECIMAL(65,30) DEFAULT 0,
    "elevation_m" DECIMAL(65,30) DEFAULT 0,
    "duration_min" INTEGER DEFAULT 0,
    "completed_by_activity_id" TEXT,
    "source_provider" "FitnessProvider",
    "metadata" JSONB,

    CONSTRAINT "challenge_checkpoint_progresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_connections" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "provider" "FitnessProvider" NOT NULL,
    "provider_user_id" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3),
    "webhook_subscription_id" TEXT,
    "metadata" JSONB,

    CONSTRAINT "external_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_activities" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,
    "external_connection_id" TEXT,
    "provider" "FitnessProvider" NOT NULL,
    "provider_activity_id" TEXT NOT NULL,
    "name" TEXT,
    "sport_type" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "elapsed_time_sec" INTEGER,
    "moving_time_sec" INTEGER,
    "distance_m" DECIMAL(65,30),
    "elevation_gain_m" DECIMAL(65,30),
    "average_speed_mps" DECIMAL(65,30),
    "status" "SyncedActivityStatus" NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "raw_payload" JSONB,

    CONSTRAINT "synced_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_activity_links" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "participation_id" TEXT NOT NULL,
    "activity_id" TEXT NOT NULL,
    "checkpoint_progress_id" TEXT,
    "checkpoint_id" TEXT,
    "counted_distance_km" DECIMAL(65,30),
    "counted_elevation_m" DECIMAL(65,30),
    "counted_duration_min" INTEGER,
    "is_counted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "challenge_activity_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenges_slug_key" ON "challenges"("slug");

-- CreateIndex
CREATE INDEX "challenge_participations_challenge_id_status_idx" ON "challenge_participations"("challenge_id", "status");

-- CreateIndex
CREATE INDEX "challenge_participations_user_id_status_idx" ON "challenge_participations"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participations_user_id_challenge_id_key" ON "challenge_participations"("user_id", "challenge_id");

-- CreateIndex
CREATE INDEX "challenge_leaderboards_challenge_id_rank_idx" ON "challenge_leaderboards"("challenge_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_leaderboards_challenge_id_user_id_key" ON "challenge_leaderboards"("challenge_id", "user_id");

-- CreateIndex
CREATE INDEX "challenge_journey_logs_challenge_id_created_at_idx" ON "challenge_journey_logs"("challenge_id", "created_at");

-- CreateIndex
CREATE INDEX "challenge_journey_logs_user_id_challenge_id_idx" ON "challenge_journey_logs"("user_id", "challenge_id");

-- CreateIndex
CREATE INDEX "challenge_checkpoints_challenge_id_sequence_idx" ON "challenge_checkpoints"("challenge_id", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_checkpoints_challenge_id_sequence_key" ON "challenge_checkpoints"("challenge_id", "sequence");

-- CreateIndex
CREATE INDEX "challenge_checkpoint_progresses_checkpoint_id_status_idx" ON "challenge_checkpoint_progresses"("checkpoint_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_checkpoint_progresses_participation_id_checkpoint_key" ON "challenge_checkpoint_progresses"("participation_id", "checkpoint_id");

-- CreateIndex
CREATE INDEX "external_connections_provider_is_active_idx" ON "external_connections"("provider", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "external_connections_user_id_provider_key" ON "external_connections"("user_id", "provider");

-- CreateIndex
CREATE INDEX "synced_activities_user_id_started_at_idx" ON "synced_activities"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "synced_activities_status_created_at_idx" ON "synced_activities"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "synced_activities_provider_provider_activity_id_key" ON "synced_activities"("provider", "provider_activity_id");

-- CreateIndex
CREATE INDEX "challenge_activity_links_checkpoint_progress_id_idx" ON "challenge_activity_links"("checkpoint_progress_id");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_activity_links_participation_id_activity_id_key" ON "challenge_activity_links"("participation_id", "activity_id");

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participations" ADD CONSTRAINT "challenge_participations_external_connection_id_fkey" FOREIGN KEY ("external_connection_id") REFERENCES "external_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_leaderboards" ADD CONSTRAINT "challenge_leaderboards_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_leaderboards" ADD CONSTRAINT "challenge_leaderboards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_journey_logs" ADD CONSTRAINT "challenge_journey_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_journey_logs" ADD CONSTRAINT "challenge_journey_logs_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_journey_logs" ADD CONSTRAINT "challenge_journey_logs_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "challenge_participations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_journey_logs" ADD CONSTRAINT "challenge_journey_logs_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "challenge_checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_journey_logs" ADD CONSTRAINT "challenge_journey_logs_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "synced_activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_checkpoints" ADD CONSTRAINT "challenge_checkpoints_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_checkpoint_progresses" ADD CONSTRAINT "challenge_checkpoint_progresses_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "challenge_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_checkpoint_progresses" ADD CONSTRAINT "challenge_checkpoint_progresses_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "challenge_checkpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_connections" ADD CONSTRAINT "external_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_activities" ADD CONSTRAINT "synced_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_activities" ADD CONSTRAINT "synced_activities_external_connection_id_fkey" FOREIGN KEY ("external_connection_id") REFERENCES "external_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_links" ADD CONSTRAINT "challenge_activity_links_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "challenge_participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_links" ADD CONSTRAINT "challenge_activity_links_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "synced_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_links" ADD CONSTRAINT "challenge_activity_links_checkpoint_progress_id_fkey" FOREIGN KEY ("checkpoint_progress_id") REFERENCES "challenge_checkpoint_progresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_activity_links" ADD CONSTRAINT "challenge_activity_links_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "challenge_checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
