-- Add stored conversation relation to challenges
ALTER TABLE "challenges"
ADD COLUMN "conversation_id" TEXT;

CREATE UNIQUE INDEX "challenges_conversation_id_key"
ON "challenges"("conversation_id");

ALTER TABLE "challenges"
ADD CONSTRAINT "challenges_conversation_id_fkey"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
