-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('UNCLEARED', 'CLEARED', 'RECONCILED');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "cleared_at" TIMESTAMP(3),
ADD COLUMN     "reconciled_at" TIMESTAMP(3),
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'UNCLEARED';

-- CreateTable
CREATE TABLE "transaction_status_history" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "from_status" "TransactionStatus",
    "to_status" "TransactionStatus" NOT NULL,
    "changed_by_id" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "transaction_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_status_history_transaction_id_idx" ON "transaction_status_history"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_status_history_changed_at_idx" ON "transaction_status_history"("changed_at");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_account_id_status_idx" ON "transactions"("account_id", "status");

-- CreateIndex
CREATE INDEX "transactions_account_id_status_date_idx" ON "transactions"("account_id", "status", "date");

-- AddForeignKey
ALTER TABLE "transaction_status_history" ADD CONSTRAINT "transaction_status_history_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_status_history" ADD CONSTRAINT "transaction_status_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
