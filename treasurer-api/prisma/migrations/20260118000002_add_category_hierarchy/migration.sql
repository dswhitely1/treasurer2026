-- AlterTable: Add hierarchy columns to categories
-- All existing categories will become root categories (parent_id = NULL, depth = 0)
ALTER TABLE "categories" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "categories" ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "categories" ADD COLUMN "path" TEXT;
ALTER TABLE "categories" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: Add indexes for hierarchy queries
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");
CREATE INDEX "categories_organization_id_parent_id_idx" ON "categories"("organization_id", "parent_id");
CREATE INDEX "categories_path_idx" ON "categories"("path");

-- AddForeignKey: Self-referential foreign key for hierarchy
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
