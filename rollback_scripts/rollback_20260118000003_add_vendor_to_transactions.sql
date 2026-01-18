-- Rollback Migration: Add Vendor to Transactions
-- This script reverts the changes made in migration 20260118000003_add_vendor_to_transactions

-- Remove foreign key constraint
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_vendor_id_fkey";

-- Drop vendor_id index
DROP INDEX IF EXISTS "transactions_vendor_id_idx";

-- Remove vendor_id column
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "vendor_id";

-- Rename memo back to description
ALTER TABLE "transactions" RENAME COLUMN "memo" TO "description";

-- Verification query (should show description column)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions' AND column_name IN ('memo', 'description');
