-- CreateTable
CREATE TABLE "route_plans" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" SMALLINT DEFAULT 1,
    "challenge_id" TEXT NOT NULL,
    "banner_image_url" TEXT,
    "about_challenge" TEXT,
    "location" TEXT,
    "total_distance" TEXT,
    "average_completion_time" TEXT,
    "highest_point" TEXT,
    "dificulty_rating" TEXT,

    CONSTRAINT "route_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_days" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" SMALLINT DEFAULT 1,
    "routePlanId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "day_number" TEXT,
    "title" TEXT,
    "description" TEXT,
    "distance" DECIMAL(10,2),

    CONSTRAINT "route_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "route_days_routePlanId_day_number_idx" ON "route_days"("routePlanId", "day_number");

-- AddForeignKey
ALTER TABLE "route_plans" ADD CONSTRAINT "route_plans_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_days" ADD CONSTRAINT "route_days_routePlanId_fkey" FOREIGN KEY ("routePlanId") REFERENCES "route_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
