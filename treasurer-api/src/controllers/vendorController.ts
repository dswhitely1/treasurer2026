import type { RequestHandler } from "express";
import {
  createVendor,
  getOrganizationVendors,
  searchVendors,
  getVendor,
  updateVendor,
  deleteVendor,
} from "../services/vendorService.js";
import { sendSuccess, sendPaginated } from "../utils/response.js";
import type {
  CreateVendorDto,
  UpdateVendorDto,
  VendorQueryDto,
  VendorSearchDto,
} from "../schemas/vendor.js";

/**
 * @openapi
 * /api/organizations/{orgId}/vendors:
 *   post:
 *     tags: [Vendors]
 *     summary: Create a new vendor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Vendor created successfully
 *       409:
 *         description: Vendor with this name already exists
 */
export const create: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as CreateVendorDto;
    const vendor = await createVendor(req.params.orgId as string, data);
    sendSuccess(res, { vendor }, "Vendor created successfully", 201);
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /api/organizations/{orgId}/vendors:
 *   get:
 *     tags: [Vendors]
 *     summary: List vendors for an organization
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Vendors retrieved successfully
 */
export const list: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as VendorQueryDto;
    const { vendors, total } = await getOrganizationVendors(
      req.params.orgId as string,
      query,
    );

    const currentPage = Math.floor(query.offset / query.limit) + 1;
    const totalPages = Math.ceil(total / query.limit);

    sendPaginated(res, vendors, {
      total,
      limit: query.limit,
      page: currentPage,
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /api/organizations/{orgId}/vendors/search:
 *   get:
 *     tags: [Vendors]
 *     summary: Search vendors by name (autocomplete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 100
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Search results
 */
export const search: RequestHandler = async (req, res, next) => {
  try {
    const query = req.query as unknown as VendorSearchDto;
    const vendors = await searchVendors(req.params.orgId as string, query);
    sendSuccess(res, { vendors });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /api/organizations/{orgId}/vendors/{vendorId}:
 *   get:
 *     tags: [Vendors]
 *     summary: Get a vendor by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Vendor retrieved successfully
 *       404:
 *         description: Vendor not found
 */
export const get: RequestHandler = async (req, res, next) => {
  try {
    const vendor = await getVendor(
      req.params.orgId as string,
      req.params.vendorId as string,
    );
    sendSuccess(res, { vendor });
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /api/organizations/{orgId}/vendors/{vendorId}:
 *   patch:
 *     tags: [Vendors]
 *     summary: Update a vendor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *       404:
 *         description: Vendor not found
 *       409:
 *         description: Vendor name conflict
 */
export const update: RequestHandler = async (req, res, next) => {
  try {
    const data = req.body as UpdateVendorDto;
    const vendor = await updateVendor(
      req.params.orgId as string,
      req.params.vendorId as string,
      data,
    );
    sendSuccess(res, { vendor }, "Vendor updated successfully");
  } catch (error) {
    next(error);
  }
};

/**
 * @openapi
 * /api/organizations/{orgId}/vendors/{vendorId}:
 *   delete:
 *     tags: [Vendors]
 *     summary: Delete a vendor
 *     description: Hard deletes vendor only if no associated transactions exist. Returns 400 error if vendor has transactions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orgId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Vendor deleted successfully
 *       404:
 *         description: Vendor not found
 */
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const result = await deleteVendor(
      req.params.orgId as string,
      req.params.vendorId as string,
    );

    sendSuccess(res, result, "Vendor deleted successfully");
  } catch (error) {
    next(error);
  }
};
