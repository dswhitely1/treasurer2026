-- CreateEnum
CREATE TYPE "EditType" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'SPLIT_CHANGE');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by_id" TEXT,
ADD COLUMN     "last_modified_by_id" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "transaction_edit_history" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "edited_by_id" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "edit_type" "EditType" NOT NULL,
    "changes" JSONB NOT NULL,
    "previous_state" JSONB,

    CONSTRAINT "transaction_edit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_created_by_id_idx" ON "transactions"("created_by_id");

-- CreateIndex
CREATE INDEX "transactions_deleted_at_idx" ON "transactions"("deleted_at");

-- CreateIndex
CREATE INDEX "transactions_deleted_by_id_idx" ON "transactions"("deleted_by_id");

-- CreateIndex
CREATE INDEX "transactions_last_modified_by_id_idx" ON "transactions"("last_modified_by_id");

-- CreateIndex
CREATE INDEX "transaction_edit_history_edit_type_idx" ON "transaction_edit_history"("edit_type");

-- CreateIndex
CREATE INDEX "transaction_edit_history_edited_at_idx" ON "transaction_edit_history"("edited_at");

-- CreateIndex
CREATE INDEX "transaction_edit_history_edited_by_id_idx" ON "transaction_edit_history"("edited_by_id");

-- CreateIndex
CREATE INDEX "transaction_edit_history_transaction_id_edited_at_idx" ON "transaction_edit_history"("transaction_id", "edited_at");

-- CreateIndex
CREATE INDEX "transaction_edit_history_transaction_id_idx" ON "transaction_edit_history"("transaction_id");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_deleted_by_id_fkey" FOREIGN KEY ("deleted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_last_modified_by_id_fkey" FOREIGN KEY ("last_modified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_edit_history" ADD CONSTRAINT "transaction_edit_history_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_edit_history" ADD CONSTRAINT "transaction_edit_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
