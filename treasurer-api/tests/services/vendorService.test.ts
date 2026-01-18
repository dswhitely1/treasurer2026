import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../src/config/database.js";
import {
  createVendor,
  getOrganizationVendors,
  searchVendors,
  getVendor,
  updateVendor,
  deleteVendor,
  validateVendorOwnership,
} from "../../src/services/vendorService.js";

describe("Vendor Service", () => {
  let userId: string;
  let orgId: string;

  beforeEach(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: "vendor-test@example.com",
        password: "hashedpassword",
        name: "Vendor Test User",
      },
    });
    userId = user.id;

    // Create test organization
    const org = await prisma.organization.create({
      data: {
        name: "Vendor Test Org",
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

  describe("createVendor", () => {
    it("should create a new vendor with valid data", async () => {
      const vendor = await createVendor(orgId, {
        name: "Acme Corp",
        memo: "Office supplies vendor",
      });

      expect(vendor.name).toBe("Acme Corp");
      expect(vendor.description).toBe("Office supplies vendor");
      expect(vendor.organizationId).toBe(orgId);
      expect(vendor.id).toBeDefined();
      expect(vendor.createdAt).toBeDefined();
      expect(vendor.updatedAt).toBeDefined();
    });

    it("should create vendor without description", async () => {
      const vendor = await createVendor(orgId, {
        name: "Simple Vendor",
      });

      expect(vendor.name).toBe("Simple Vendor");
      expect(vendor.description).toBeNull();
    });

    it("should throw error on duplicate vendor name (case insensitive)", async () => {
      await createVendor(orgId, { name: "Acme Corp" });

      await expect(createVendor(orgId, { name: "ACME CORP" })).rejects.toThrow(
        "A vendor with this name already exists",
      );
    });

    it("should throw 409 error on duplicate vendor name", async () => {
      await createVendor(orgId, { name: "Acme Corp" });

      try {
        await createVendor(orgId, { name: "Acme Corp" });
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (error && typeof error === "object" && "statusCode" in error) {
          expect(error.statusCode).toBe(409);
        }
      }
    });

    it("should allow same vendor name in different organizations", async () => {
      // Create another organization
      const org2 = await prisma.organization.create({
        data: {
          name: "Another Org",
          members: {
            create: {
              userId,
              role: "OWNER",
            },
          },
        },
      });

      await createVendor(orgId, { name: "Shared Vendor" });
      const vendor2 = await createVendor(org2.id, { name: "Shared Vendor" });

      expect(vendor2.name).toBe("Shared Vendor");
      expect(vendor2.organizationId).toBe(org2.id);
    });
  });

  describe("getOrganizationVendors", () => {
    beforeEach(async () => {
      // Create test vendors
      await createVendor(orgId, { name: "Acme Corp", memo: "Office supplies" });
      await createVendor(orgId, { name: "Beta Inc", memo: "Technology" });
      await createVendor(orgId, { name: "Gamma LLC", memo: "Consulting" });
    });

    it("should return all vendors for organization", async () => {
      const result = await getOrganizationVendors(orgId, {
        limit: 50,
        offset: 0,
      });

      expect(result.vendors).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it("should return vendors sorted by name", async () => {
      const result = await getOrganizationVendors(orgId, {
        limit: 50,
        offset: 0,
      });

      expect(result.vendors[0]?.name).toBe("Acme Corp");
      expect(result.vendors[1]?.name).toBe("Beta Inc");
      expect(result.vendors[2]?.name).toBe("Gamma LLC");
    });

    it("should filter vendors by search query", async () => {
      const result = await getOrganizationVendors(orgId, {
        search: "acme",
        limit: 50,
        offset: 0,
      });

      expect(result.vendors).toHaveLength(1);
      expect(result.vendors[0]?.name).toBe("Acme Corp");
      expect(result.total).toBe(1);
    });

    it("should perform case-insensitive search", async () => {
      const result = await getOrganizationVendors(orgId, {
        search: "BETA",
        limit: 50,
        offset: 0,
      });

      expect(result.vendors).toHaveLength(1);
      expect(result.vendors[0]?.name).toBe("Beta Inc");
    });

    it("should support pagination with limit", async () => {
      const result = await getOrganizationVendors(orgId, {
        limit: 2,
        offset: 0,
      });

      expect(result.vendors).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it("should support pagination with offset", async () => {
      const result = await getOrganizationVendors(orgId, {
        limit: 2,
        offset: 2,
      });

      expect(result.vendors).toHaveLength(1);
      expect(result.vendors[0]?.name).toBe("Gamma LLC");
      expect(result.total).toBe(3);
    });

    it("should return empty array if no vendors found", async () => {
      const result = await getOrganizationVendors(orgId, {
        search: "nonexistent",
        limit: 50,
        offset: 0,
      });

      expect(result.vendors).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe("searchVendors", () => {
    beforeEach(async () => {
      await createVendor(orgId, { name: "Amazon" });
      await createVendor(orgId, { name: "Apple Store" });
      await createVendor(orgId, { name: "Best Buy" });
      await createVendor(orgId, { name: "Walmart" });
    });

    it("should search vendors by name prefix", async () => {
      const results = await searchVendors(orgId, { q: "A", limit: 10 });

      expect(results).toHaveLength(2);
      expect(results.some((v) => v.name === "Amazon")).toBe(true);
      expect(results.some((v) => v.name === "Apple Store")).toBe(true);
    });

    it("should search vendors case-insensitively", async () => {
      const results = await searchVendors(orgId, { q: "walmart", limit: 10 });

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("Walmart");
    });

    it("should limit search results", async () => {
      const results = await searchVendors(orgId, { q: "a", limit: 1 });

      expect(results).toHaveLength(1);
    });

    it("should return empty array if no matches", async () => {
      const results = await searchVendors(orgId, { q: "xyz", limit: 10 });

      expect(results).toHaveLength(0);
    });

    it("should search by partial name match", async () => {
      const results = await searchVendors(orgId, { q: "Store", limit: 10 });

      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("Apple Store");
    });
  });

  describe("getVendor", () => {
    let vendorId: string;

    beforeEach(async () => {
      const vendor = await createVendor(orgId, {
        name: "Test Vendor",
        memo: "Test description",
      });
      vendorId = vendor.id;
    });

    it("should return vendor with transaction count", async () => {
      const result = await getVendor(orgId, vendorId);

      expect(result.id).toBe(vendorId);
      expect(result.name).toBe("Test Vendor");
      expect(result.description).toBe("Test description");
      expect(result.transactionCount).toBe(0);
    });

    it("should include transaction count when vendor has transactions", async () => {
      // Create account and transaction
      const account = await prisma.account.create({
        data: {
          name: "Test Account",
          organizationId: orgId,
          accountType: "CHECKING",
        },
      });

      await prisma.transaction.create({
        data: {
          memo: "Test transaction",
          amount: 100,
          transactionType: "EXPENSE",
          accountId: account.id,
          vendorId,
        },
      });

      const result = await getVendor(orgId, vendorId);
      expect(result.transactionCount).toBe(1);
    });

    it("should throw 404 error for non-existent vendor", async () => {
      try {
        await getVendor(orgId, "00000000-0000-0000-0000-000000000000");
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (error && typeof error === "object" && "statusCode" in error) {
          expect(error.statusCode).toBe(404);
        }
      }
    });

    it("should throw 404 error for vendor in different organization", async () => {
      const org2 = await prisma.organization.create({
        data: {
          name: "Other Org",
          members: {
            create: {
              userId,
              role: "OWNER",
            },
          },
        },
      });

      try {
        await getVendor(org2.id, vendorId);
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (error && typeof error === "object" && "statusCode" in error) {
          expect(error.statusCode).toBe(404);
        }
      }
    });
  });

  describe("updateVendor", () => {
    let vendorId: string;

    beforeEach(async () => {
      const vendor = await createVendor(orgId, {
        name: "Original Name",
        memo: "Original description",
      });
      vendorId = vendor.id;
    });

    it("should update vendor name", async () => {
      const updated = await updateVendor(orgId, vendorId, {
        name: "Updated Name",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.description).toBe("Original description");
    });

    it("should update vendor description", async () => {
      const updated = await updateVendor(orgId, vendorId, {
        memo: "Updated description",
      });

      expect(updated.name).toBe("Original Name");
      expect(updated.description).toBe("Updated description");
    });

    it("should update both name and description", async () => {
      const updated = await updateVendor(orgId, vendorId, {
        name: "New Name",
        memo: "New description",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.description).toBe("New description");
    });

    it("should allow setting description to null", async () => {
      const updated = await updateVendor(orgId, vendorId, {
        description: null,
      });

      expect(updated.description).toBeNull();
    });

    it("should throw error on duplicate name", async () => {
      await createVendor(orgId, { name: "Another Vendor" });

      await expect(
        updateVendor(orgId, vendorId, { name: "Another Vendor" }),
      ).rejects.toThrow("A vendor with this name already exists");
    });

    it("should allow updating to same name (case change)", async () => {
      const updated = await updateVendor(orgId, vendorId, {
        name: "ORIGINAL NAME",
      });

      expect(updated.name).toBe("ORIGINAL NAME");
    });

    it("should throw 404 error for non-existent vendor", async () => {
      try {
        await updateVendor(orgId, "00000000-0000-0000-0000-000000000000", {
          name: "New Name",
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

  describe("deleteVendor", () => {
    let vendorId: string;

    beforeEach(async () => {
      const vendor = await createVendor(orgId, { name: "Vendor to Delete" });
      vendorId = vendor.id;
    });

    it("should delete vendor without transactions", async () => {
      const result = await deleteVendor(orgId, vendorId);

      expect(result.deleted).toBe(true);

      // Verify deletion
      const vendors = await getOrganizationVendors(orgId, {
        limit: 50,
        offset: 0,
      });
      expect(vendors.vendors).toHaveLength(0);
    });

    it("should throw error when deleting vendor with transactions", async () => {
      // Create account and transaction
      const account = await prisma.account.create({
        data: {
          name: "Test Account",
          organizationId: orgId,
          accountType: "CHECKING",
        },
      });

      await prisma.transaction.create({
        data: {
          memo: "Test transaction",
          amount: 100,
          transactionType: "EXPENSE",
          accountId: account.id,
          vendorId,
        },
      });

      await expect(deleteVendor(orgId, vendorId)).rejects.toThrow(
        "Cannot delete vendor with transactions",
      );
    });

    it("should throw 400 error code when vendor has transactions", async () => {
      const account = await prisma.account.create({
        data: {
          name: "Test Account",
          organizationId: orgId,
          accountType: "CHECKING",
        },
      });

      await prisma.transaction.create({
        data: {
          memo: "Test transaction",
          amount: 100,
          transactionType: "EXPENSE",
          accountId: account.id,
          vendorId,
        },
      });

      try {
        await deleteVendor(orgId, vendorId);
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (error && typeof error === "object" && "statusCode" in error) {
          expect(error.statusCode).toBe(400);
        }
      }
    });

    it("should throw 404 error for non-existent vendor", async () => {
      try {
        await deleteVendor(orgId, "00000000-0000-0000-0000-000000000000");
        expect.fail("Should have thrown error");
      } catch (error: unknown) {
        expect(error).toBeDefined();
        if (error && typeof error === "object" && "statusCode" in error) {
          expect(error.statusCode).toBe(404);
        }
      }
    });

    it("should hard delete vendor from database", async () => {
      await deleteVendor(orgId, vendorId);

      // Verify vendor is completely removed
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
      });

      expect(vendor).toBeNull();
    });
  });

  describe("validateVendorOwnership", () => {
    let vendorId: string;

    beforeEach(async () => {
      const vendor = await createVendor(orgId, { name: "Test Vendor" });
      vendorId = vendor.id;
    });

    it("should return true for vendor in organization", async () => {
      const isValid = await validateVendorOwnership(vendorId, orgId);
      expect(isValid).toBe(true);
    });

    it("should return false for vendor in different organization", async () => {
      const org2 = await prisma.organization.create({
        data: {
          name: "Other Org",
          members: {
            create: {
              userId,
              role: "OWNER",
            },
          },
        },
      });

      const isValid = await validateVendorOwnership(vendorId, org2.id);
      expect(isValid).toBe(false);
    });

    it("should return false for non-existent vendor", async () => {
      const isValid = await validateVendorOwnership(
        "00000000-0000-0000-0000-000000000000",
        orgId,
      );
      expect(isValid).toBe(false);
    });
  });
});
