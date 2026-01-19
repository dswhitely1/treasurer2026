-- Rollback script for add_transaction_audit_fields migration
-- WARNING: This will permanently delete audit trail data!

-- DropForeignKey
ALTER TABLE "transaction_edit_history" DROP CONSTRAINT "transaction_edit_history_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "transaction_edit_history" DROP CONSTRAINT "transaction_edit_history_edited_by_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_last_modified_by_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_deleted_by_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_created_by_id_fkey";

-- DropIndex
DROP INDEX "transaction_edit_history_transaction_id_idx";

-- DropIndex
DROP INDEX "transaction_edit_history_transaction_id_edited_at_idx";

-- DropIndex
DROP INDEX "transaction_edit_history_edited_by_id_idx";

-- DropIndex
DROP INDEX "transaction_edit_history_edited_at_idx";

-- DropIndex
DROP INDEX "transaction_edit_history_edit_type_idx";

-- DropIndex
DROP INDEX "transactions_last_modified_by_id_idx";

-- DropIndex
DROP INDEX "transactions_deleted_by_id_idx";

-- DropIndex
DROP INDEX "transactions_deleted_at_idx";

-- DropIndex
DROP INDEX "transactions_created_by_id_idx";

-- DropTable
DROP TABLE "transaction_edit_history";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "version",
DROP COLUMN "last_modified_by_id",
DROP COLUMN "deleted_by_id",
DROP COLUMN "deleted_at",
DROP COLUMN "created_by_id";

-- DropEnum
DROP TYPE "EditType";
