-- AlterTable
ALTER TABLE "League" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "League_isPublic_idx" ON "League"("isPublic");
