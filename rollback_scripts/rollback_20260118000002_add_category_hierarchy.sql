-- Rollback Migration: Add Category Hierarchy
-- This script reverts the changes made in migration 20260118000002_add_category_hierarchy

-- WARNING: Before running this rollback:
-- 1. Ensure no child categories exist (parent_id IS NOT NULL)
-- 2. Backup your database
-- 3. Verify that removing hierarchy won't break application logic

-- Remove self-referential foreign key
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_parent_id_fkey";

-- Drop hierarchy indexes
DROP INDEX IF EXISTS "categories_parent_id_idx";
DROP INDEX IF EXISTS "categories_organization_id_parent_id_idx";
DROP INDEX IF EXISTS "categories_path_idx";

-- Remove hierarchy columns
ALTER TABLE "categories" DROP COLUMN IF EXISTS "parent_id";
ALTER TABLE "categories" DROP COLUMN IF EXISTS "depth";
ALTER TABLE "categories" DROP COLUMN IF EXISTS "path";
ALTER TABLE "categories" DROP COLUMN IF EXISTS "is_active";

-- Verification query (should show no hierarchy columns)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'categories' ORDER BY ordinal_position;
