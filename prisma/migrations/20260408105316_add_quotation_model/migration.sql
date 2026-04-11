-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "user_id" TEXT,
    "challenge_title" TEXT NOT NULL,
    "support_needed" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT,
    "phone_number" TEXT,
    "status" TEXT DEFAULT 'pending',
    "admin_notes" TEXT,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotations_user_id_idx" ON "quotations"("user_id");

-- CreateIndex
CREATE INDEX "quotations_status_idx" ON "quotations"("status");

-- CreateIndex
CREATE INDEX "quotations_created_at_idx" ON "quotations"("created_at");

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
