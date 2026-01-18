-- Fix category unique constraint to allow same name at different hierarchy levels
-- This allows "Office Supplies" under both "Expenses" and "Income" hierarchies

-- Drop the old global unique constraint on (organization_id, name)
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_organization_id_name_key";

-- Add new unique constraint on (organization_id, parent_id, name)
-- This allows same name at different hierarchy levels while preventing duplicates at the same level
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_parent_id_name_key"
  UNIQUE ("organization_id", "parent_id", "name");
