-- Rollback Migration: Add Vendors
-- This script reverts the changes made in migration 20260118000001_add_vendors

-- WARNING: Before running this rollback:
-- 1. Ensure no transactions reference vendors (vendor_id IS NOT NULL)
-- 2. Backup your database
-- 3. All vendor data will be permanently deleted

-- First, remove vendor references from transactions if they exist
-- UPDATE transactions SET vendor_id = NULL WHERE vendor_id IS NOT NULL;

-- Remove foreign key constraint
ALTER TABLE "vendors" DROP CONSTRAINT IF EXISTS "vendors_organization_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "vendors_organization_id_idx";
DROP INDEX IF EXISTS "vendors_name_trgm_idx";
DROP INDEX IF EXISTS "vendors_organization_id_name_key";

-- Drop vendors table
DROP TABLE IF EXISTS "vendors";

-- Optionally drop pg_trgm extension if no other tables use it
-- WARNING: Only run this if you're certain no other features use pg_trgm
-- DROP EXTENSION IF EXISTS pg_trgm;

-- Verification query (should return no rows)
-- SELECT tablename FROM pg_tables WHERE tablename = 'vendors';
