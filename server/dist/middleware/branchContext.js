"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enforceBranchContext = exports.MULTI_BRANCH_ROLES = void 0;
exports.resolveBranchContext = resolveBranchContext;
const prisma_1 = require("../app/lib/prisma");
exports.MULTI_BRANCH_ROLES = [
    "COMPANY_OWNER",
    "SUPER_ADMIN",
    "REGIONAL_ADMIN",
    "CTO",
    "PROJECT_MANAGER",
];
/**
 * Extracts and verifies the branch context for an authenticated request.
 * - Enforces branch confinement for Branch Managers and staff.
 * - Allows Company Owner / Regional Admins to switch branches or query "all".
 * - Enforces strict tenant isolation for all branch operations.
 */
async function resolveBranchContext(req) {
    if (!req.user) {
        return { branchId: undefined, isAllBranches: true };
    }
    const user = req.user;
    const isMultiBranchAllowed = exports.MULTI_BRANCH_ROLES.includes(user.role);
    // Extract requested branch from headers, query, or body
    const headerBranch = req.headers["x-branch-id"]?.trim();
    const queryBranch = req.query.branchId?.trim();
    const bodyBranch = (typeof req.body?.branchId === "string" ? req.body.branchId : undefined)?.trim();
    const requestedBranch = queryBranch || headerBranch || bodyBranch;
    // Case 1: Staff / Branch Manager with an assigned branch
    if (!isMultiBranchAllowed && user.branchId) {
        // If staff tries to request a different branch, reject with unauthorized attempt
        if (requestedBranch && requestedBranch !== "all" && requestedBranch !== user.branchId) {
            const error = new Error("Access denied: You are only authorized to access your assigned branch.");
            error.status = 403;
            throw error;
        }
        req.effectiveBranchId = user.branchId;
        return { branchId: user.branchId, isAllBranches: false };
    }
    // Case 2: Multi-Branch permitted role (Pharmacy Owner, Super Admin, Regional Admin)
    if (isMultiBranchAllowed) {
        if (!requestedBranch || requestedBranch === "all" || requestedBranch === "") {
            req.effectiveBranchId = undefined;
            return { branchId: undefined, isAllBranches: true };
        }
        // Verify requested branch belongs to this tenant and is active
        const branch = await prisma_1.prisma.branch.findFirst({
            where: {
                id: requestedBranch,
                tenantId: user.tenantId,
                isActive: true,
            },
        });
        if (!branch) {
            const error = new Error("Requested branch does not exist or is inactive for your organization.");
            error.status = 400;
            throw error;
        }
        req.effectiveBranchId = branch.id;
        return { branchId: branch.id, isAllBranches: false };
    }
    // Case 3: Staff without an assigned branch (defaults to company-wide or null)
    req.effectiveBranchId = user.branchId || undefined;
    return { branchId: req.effectiveBranchId, isAllBranches: !req.effectiveBranchId };
}
/**
 * Express middleware to automatically resolve and enforce branch context.
 */
const enforceBranchContext = (options = {}) => {
    return async (req, res, next) => {
        try {
            const context = await resolveBranchContext(req);
            if (options.required && context.isAllBranches) {
                res.status(400).json({
                    success: false,
                    message: "A specific branch must be selected for this operation.",
                });
                return;
            }
            next();
        }
        catch (err) {
            res.status(err.status || 400).json({
                success: false,
                message: err.message || "Failed to verify branch context.",
            });
        }
    };
};
exports.enforceBranchContext = enforceBranchContext;
