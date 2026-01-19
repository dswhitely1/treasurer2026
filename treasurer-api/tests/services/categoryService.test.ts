import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../src/config/database.js";
import {
  createCategory,
  getOrganizationCategories,
  getCategoryTree,
  getCategory,
  updateCategory,
  moveCategory,
  deleteCategory,
} from "../../src/services/categoryService.js";

describe("Category Service", () => {
  let userId: string;
  let orgId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: "category-test@example.com",
        password: "hashedpassword",
        name: "Category Test User",
      },
    });
    userId = user.id;

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: "Category Test Org",
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
    });
    orgId = org.id;
  });

  describe("createCategory", () => {
    it("should create a root category", async () => {
      const category = await createCategory(orgId, {
        name: "Food",
      });

      expect(category.name).toBe("Food");
      expect(category.parentId).toBeNull();
      expect(category.depth).toBe(0);
      expect(category.organizationId).toBe(orgId);
      expect(category.isActive).toBe(true);
    });

    it("should create a child category", async () => {
      const parent = await createCategory(orgId, { name: "Food" });
      const child = await createCategory(orgId, {
        name: "Restaurants",
        parentId: parent.id,
      });

      expect(child.name).toBe("Restaurants");
      expect(child.parentId).toBe(parent.id);
      expect(child.depth).toBe(1);
    });

    it("should create a grandchild category (depth 2)", async () => {
      const parent = await createCategory(orgId, { name: "Food" });
      const child = await createCategory(orgId, {
        name: "Restaurants",
        parentId: parent.id,
      });
      const grandchild = await createCategory(orgId, {
        name: "Fast Food",
        parentId: child.id,
      });

      expect(grandchild.name).toBe("Fast Food");
      expect(grandchild.parentId).toBe(child.id);
      expect(grandchild.depth).toBe(2);
    });

    it("should enforce maximum depth of 3 levels", async () => {
      const level0 = await createCategory(orgId, { name: "Level 0" });
      const level1 = await createCategory(orgId, {
        name: "Level 1",
        parentId: level0.id,
      });
      const level2 = await createCategory(orgId, {
        name: "Level 2",
        parentId: level1.id,
      });

      // This should succeed (depth 3, which is allowed)
      const level3 = await createCategory(orgId, {
        name: "Level 3",
        parentId: level2.id,
      });
      expect(level3.depth).toBe(3);

      // This should fail (depth 4, exceeds max)
      await expect(
        createCategory(orgId, {
          name: "Level 4",
          parentId: level3.id,
        }),
      ).rejects.toThrow("Category depth cannot exceed 3");
    });

    it("should throw error for duplicate category name at same level", async () => {
      await createCategory(orgId, { name: "Food" });

      await expect(createCategory(orgId, { name: "Food" })).rejects.toThrow(
        "A category with this name already exists at this level",
      );
    });

    it("should allow duplicate names at different levels", async () => {
      const parent = await createCategory(orgId, { name: "Food" });
      const child = await createCategory(orgId, {
        name: "Food",
        parentId: parent.id,
      });

      expect(child.name).toBe("Food");
      expect(child.parentId).toBe(parent.id);
    });

    it("should perform case-insensitive duplicate check", async () => {
      await createCategory(orgId, { name: "Food" });

      await expect(createCategory(orgId, { name: "FOOD" })).rejects.toThrow(
        "A category with this name already exists at this level",
      );
    });

    it("should throw 404 error for non-existent parent", async () => {
      try {
        await createCategory(orgId, {
          name: "Child",
          parentId: "00000000-0000-0000-0000-000000000000",
        });
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (error && typeof error === "object" && "statusCode" in error) {
          expect(error.statusCode).toBe(404);
        }
      }
    });
  });

  describe("getOrganizationCategories", () => {
    beforeEach(async () => {
      // Create category hierarchy
      const food = await createCategory(orgId, { name: "Food" });
      const restaurants = await createCategory(orgId, {
        name: "Restaurants",
        parentId: food.id,
      });
      await createCategory(orgId, {
        name: "Fast Food",
        parentId: restaurants.id,
      });
      await createCategory(orgId, {
        name: "Fine Dining",
        parentId: restaurants.id,
      });
      await createCategory(orgId, { name: "Groceries", parentId: food.id });
      await createCategory(orgId, { name: "Transportation" });
    });

    it("should return all categories for organization", async () => {
      const categories = await getOrganizationCategories(orgId, { limit: 50 });

      expect(categories).toHaveLength(6);
    });

    it("should return categories ordered by depth then name", async () => {
      const categories = await getOrganizationCategories(orgId, { limit: 50 });

      // Depth 0 categories should come first
      expect(categories[0]?.depth).toBe(0);
      expect(categories[1]?.depth).toBe(0);
    });

    it("should filter by search query", async () => {
      const categories = await getOrganizationCategories(orgId, {
        search: "food",
        limit: 50,
      });

      expect(categories.length).toBeGreaterThan(0);
      expect(
        categories.some((c) => c.name.toLowerCase().includes("food")),
      ).toBe(true);
    });

    it("should filter by parent ID", async () => {
      const food = await prisma.category.findFirst({
        where: { name: "Food", organizationId: orgId },
      });

      const categories = await getOrganizationCategories(orgId, {
        parentId: food!.id,
        limit: 50,
      });

      expect(categories).toHaveLength(2); // Restaurants and Groceries
      expect(categories.every((c) => c.parentId === food!.id)).toBe(true);
    });

    it("should include descendants when requested", async () => {
      const food = await prisma.category.findFirst({
        where: { name: "Food", organizationId: orgId },
      });

      const categories = await getOrganizationCategories(orgId, {
        parentId: food!.id,
        includeDescendants: "true",
        limit: 50,
      });

      // Should include: Food itself, Restaurants, Groceries, Fast Food, Fine Dining
      expect(categories.length).toBeGreaterThanOrEqual(4);
    });

    it("should respect limit parameter", async () => {
      const categories = await getOrganizationCategories(orgId, { limit: 2 });

      expect(categories).toHaveLength(2);
    });
  });

  describe("getCategoryTree", () => {
    beforeEach(async () => {
      // Create category hierarchy
      const food = await createCategory(orgId, { name: "Food" });
      const restaurants = await createCategory(orgId, {
        name: "Restaurants",
        parentId: food.id,
      });
      await createCategory(orgId, {
        name: "Fast Food",
        parentId: restaurants.id,
      });
      await createCategory(orgId, { name: "Transportation" });
    });

    it("should build hierarchical category tree", async () => {
      const tree = await getCategoryTree(orgId);

      expect(tree).toHaveLength(2); // Food and Transportation
      expect(tree[0]?.children).toBeDefined();
    });

    it("should include nested children in tree", async () => {
      const tree = await getCategoryTree(orgId);

      const food = tree.find((c) => c.name === "Food");
      expect(food?.children).toHaveLength(1);
      expect(food?.children[0]?.name).toBe("Restaurants");
      expect(food?.children[0]?.children).toHaveLength(1);
      expect(food?.children[0]?.children[0]?.name).toBe("Fast Food");
    });

    it("should cache category tree", async () => {
      const tree1 = await getCategoryTree(orgId);
      const tree2 = await getCategoryTree(orgId);

      // Should return same structure (cached)
      expect(tree1).toEqual(tree2);
    });
  });

  describe("getCategory", () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await createCategory(orgId, { name: "Test Category" });
      categoryId = category.id;
    });

    it("should return category with statistics", async () => {
      const result = await getCategory(orgId, categoryId);

      expect(result.id).toBe(categoryId);
      expect(result.name).toBe("Test Category");
      expect(result.transactionCount).toBe(0);
      expect(result.childCount).toBe(0);
    });

    it("should include child count", async () => {
      await createCategory(orgId, {
        name: "Child 1",
        parentId: categoryId,
      });
      await createCategory(orgId, {
        name: "Child 2",
        parentId: categoryId,
      });

      const result = await getCategory(orgId, categoryId);
      expect(result.childCount).toBe(2);
    });

    it("should throw 404 error for non-existent category", async () => {
      try {
        await getCategory(orgId, "00000000-0000-0000-0000-000000000000");
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (error && typeof error === "object" && "statusCode" in error) {
          expect(error.statusCode).toBe(404);
        }
      }
    });
  });

  describe("updateCategory", () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await createCategory(orgId, { name: "Original Name" });
      categoryId = category.id;
    });

    it("should update category name", async () => {
      const updated = await updateCategory(orgId, categoryId, {
        name: "Updated Name",
      });

      expect(updated.name).toBe("Updated Name");
    });

    it("should prevent circular reference when updating parent", async () => {
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: categoryId,
      });

      await expect(
        updateCategory(orgId, categoryId, { parentId: child.id }),
      ).rejects.toThrow("Cannot create circular category reference");
    });

    it("should prevent circular reference with grandchild", async () => {
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: categoryId,
      });
      const grandchild = await createCategory(orgId, {
        name: "Grandchild",
        parentId: child.id,
      });

      await expect(
        updateCategory(orgId, categoryId, { parentId: grandchild.id }),
      ).rejects.toThrow("Cannot create circular category reference");
    });

    it("should update parent and recalculate depth", async () => {
      const newParent = await createCategory(orgId, { name: "New Parent" });
      const updated = await updateCategory(orgId, categoryId, {
        parentId: newParent.id,
      });

      expect(updated.parentId).toBe(newParent.id);
      expect(updated.depth).toBe(1);
    });

    it("should update descendant depths when parent changes", async () => {
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: categoryId,
      });
      const newParent = await createCategory(orgId, { name: "New Parent" });

      // Move category to new parent
      await updateCategory(orgId, categoryId, { parentId: newParent.id });

      // Check child depth updated
      const updatedChild = await getCategory(orgId, child.id);
      expect(updatedChild.depth).toBe(2); // new parent (1) + 1
    });

    it("should allow moving to max depth", async () => {
      // Create category to move
      const categoryToMove = await createCategory(orgId, {
        name: "Category to Move",
      });

      // Create deep hierarchy (0 -> 1 -> 2)
      const deep1 = await createCategory(orgId, { name: "Deep 1" });
      const deep2 = await createCategory(orgId, {
        name: "Deep 2",
        parentId: deep1.id,
      });
      const deep3 = await createCategory(orgId, {
        name: "Deep 3",
        parentId: deep2.id,
      });

      // Move categoryToMove under deep3 (depth 3, which is max allowed)
      const updated = await updateCategory(orgId, categoryToMove.id, {
        parentId: deep3.id,
      });
      expect(updated.depth).toBe(3);
    });

    it("should allow moving with descendants to max depth", async () => {
      const parent = await createCategory(orgId, { name: "Parent" });
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: parent.id,
      });
      const grandchild = await createCategory(orgId, {
        name: "Grandchild",
        parentId: child.id,
      });

      // Create deep hierarchy
      const deep1 = await createCategory(orgId, { name: "Deep 1" });
      const deep2 = await createCategory(orgId, {
        name: "Deep 2",
        parentId: deep1.id,
      });

      // Move child (which has grandchild) under deep2
      // child will be at depth 2, grandchild at depth 3 (max allowed)
      const updated = await updateCategory(orgId, child.id, {
        parentId: deep2.id,
      });
      expect(updated.depth).toBe(2);

      const updatedGrandchild = await getCategory(orgId, grandchild.id);
      expect(updatedGrandchild.depth).toBe(3);
    });

    it("should allow setting parent to null (move to root)", async () => {
      const parent = await createCategory(orgId, { name: "Parent" });
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: parent.id,
      });

      const updated = await updateCategory(orgId, child.id, { parentId: null });

      expect(updated.parentId).toBeNull();
      expect(updated.depth).toBe(0);
    });
  });

  describe("moveCategory", () => {
    it("should move category to new parent", async () => {
      const parent1 = await createCategory(orgId, { name: "Parent 1" });
      const parent2 = await createCategory(orgId, { name: "Parent 2" });
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: parent1.id,
      });

      const moved = await moveCategory(orgId, child.id, {
        newParentId: parent2.id,
      });

      expect(moved.parentId).toBe(parent2.id);
    });

    it("should move category to root level", async () => {
      const parent = await createCategory(orgId, { name: "Parent" });
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: parent.id,
      });

      const moved = await moveCategory(orgId, child.id, { newParentId: null });

      expect(moved.parentId).toBeNull();
      expect(moved.depth).toBe(0);
    });
  });

  describe("deleteCategory", () => {
    let categoryId: string;

    beforeEach(async () => {
      const category = await createCategory(orgId, {
        name: "Category to Delete",
      });
      categoryId = category.id;
    });

    it("should delete category without children or transactions", async () => {
      await deleteCategory(orgId, categoryId);

      // Verify deletion
      const categories = await getOrganizationCategories(orgId, { limit: 50 });
      expect(categories).toHaveLength(0);
    });

    it("should throw error when deleting category with transactions", async () => {
      // Create account and transaction with split
      const account = await prisma.account.create({
        data: {
          name: "Test Account",
          organizationId: orgId,
          accountType: "CHECKING",
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          memo: "Test transaction",
          amount: 100,
          transactionType: "EXPENSE",
          accountId: account.id,
        },
      });

      await prisma.transactionSplit.create({
        data: {
          transactionId: transaction.id,
          categoryId,
          amount: 100,
        },
      });

      await expect(deleteCategory(orgId, categoryId)).rejects.toThrow(
        "Cannot delete category with transactions",
      );
    });

    it("should throw error when category has children without moveChildrenTo", async () => {
      await createCategory(orgId, {
        name: "Child",
        parentId: categoryId,
      });

      await expect(deleteCategory(orgId, categoryId)).rejects.toThrow(
        "Category has children",
      );
    });

    it("should move children to target category before deletion", async () => {
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: categoryId,
      });
      const targetParent = await createCategory(orgId, {
        name: "Target Parent",
      });

      await deleteCategory(orgId, categoryId, {
        moveChildrenTo: targetParent.id,
      });

      // Verify child was moved
      const updatedChild = await getCategory(orgId, child.id);
      expect(updatedChild.parentId).toBe(targetParent.id);

      // Verify original category was deleted
      const categories = await getOrganizationCategories(orgId, { limit: 50 });
      expect(categories.some((c) => c.id === categoryId)).toBe(false);
    });

    it("should move children to root level when moveChildrenTo is null", async () => {
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: categoryId,
      });

      await deleteCategory(orgId, categoryId, { moveChildrenTo: null });

      // Verify child was moved to root
      const updatedChild = await getCategory(orgId, child.id);
      expect(updatedChild.parentId).toBeNull();
      expect(updatedChild.depth).toBe(0);
    });

    it("should throw error when moving children to descendant", async () => {
      const child = await createCategory(orgId, {
        name: "Child",
        parentId: categoryId,
      });

      await expect(
        deleteCategory(orgId, categoryId, { moveChildrenTo: child.id }),
      ).rejects.toThrow("Cannot move children to a descendant category");
    });

    it("should throw 404 error for non-existent target category", async () => {
      await createCategory(orgId, {
        name: "Child",
        parentId: categoryId,
      });

      await expect(
        deleteCategory(orgId, categoryId, {
          moveChildrenTo: "00000000-0000-0000-0000-000000000000",
        }),
      ).rejects.toThrow("Target category not found");
    });

    it("should hard delete category from database", async () => {
      await deleteCategory(orgId, categoryId);

      // Verify category is completely removed
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      expect(category).toBeNull();
    });
  });
});
