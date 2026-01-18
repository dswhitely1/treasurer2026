-- AlterTable: Rename description to memo (preserves existing data)
ALTER TABLE "transactions" RENAME COLUMN "description" TO "memo";

-- AlterTable: Add vendor_id to transactions
ALTER TABLE "transactions" ADD COLUMN "vendor_id" TEXT;

-- CreateIndex: Add index for vendor lookups
CREATE INDEX "transactions_vendor_id_idx" ON "transactions"("vendor_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
