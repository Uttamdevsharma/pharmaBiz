"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../../app/lib/prisma");
const product_service_1 = require("../product/product.service");
const upload_service_1 = require("../upload/upload.service");
const email_service_1 = require("../../app/lib/email.service");
const requirePermission_1 = require("../../middleware/requirePermission");
class AuthService {
    /**
     * Log in via username or email
     */
    static async login(data) {
        const identifier = (data.username || data.email || "").trim();
        if (!identifier) {
            throw new Error("Username or email is required");
        }
        const user = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { username: identifier },
                    { email: identifier },
                ],
            },
            include: {
                tenant: {
                    include: {
                        subscriptions: {
                            where: { status: "ACTIVE" },
                            include: { plan: true },
                            take: 1,
                        },
                    },
                },
            },
        });
        if (!user) {
            throw new Error("Invalid username/email or password");
        }
        if (!user.isActive) {
            throw new Error("Your user account has been deactivated. Please contact support.");
        }
        const isPasswordValid = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error("Invalid username/email or password");
        }
        // Resolve custom role, pharmacy role, and effective permissions
        let effectivePermissions = user.permissions || [];
        let customRoleName = user.customRoleName || null;
        let pharmacyRoleName = user.pharmacyRoleName || null;
        if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_OWNER") {
            effectivePermissions = ["*"];
        }
        else if (user.pharmacyRoleId) {
            try {
                const pharmacyRole = await prisma_1.prisma.pharmacyRole.findUnique({
                    where: { id: user.pharmacyRoleId },
                });
                if (pharmacyRole) {
                    pharmacyRoleName = pharmacyRole.name;
                    const combined = new Set([...(pharmacyRole.permissions || []), ...(user.permissions || [])]);
                    effectivePermissions = Array.from(combined);
                }
            }
            catch (e) {
                // Fallback
            }
        }
        else if (user.customRoleId) {
            try {
                const customRole = await prisma_1.prisma.platformRole.findUnique({
                    where: { id: user.customRoleId },
                });
                if (customRole) {
                    customRoleName = customRole.name;
                    const combined = new Set([...(customRole.permissions || []), ...(user.permissions || [])]);
                    effectivePermissions = Array.from(combined);
                }
            }
            catch (e) {
                // Fallback
            }
        }
        else if (effectivePermissions.length === 0 && requirePermission_1.DEFAULT_ROLE_PERMISSIONS[user.role]) {
            effectivePermissions = requirePermission_1.DEFAULT_ROLE_PERMISSIONS[user.role] || [];
        }
        const tenantVerificationStatus = user.tenant?.verificationStatus || "ACTIVE";
        const requiresOtp = user.role === "COMPANY_OWNER" && tenantVerificationStatus === "PENDING_OTP";
        const paymentRequired = user.role === "COMPANY_OWNER" && tenantVerificationStatus === "APPROVED_PENDING_PAYMENT";
        const payload = {
            id: user.id,
            tenantId: user.tenantId,
            branchId: user.branchId,
            role: user.role,
            customRoleId: user.customRoleId || null,
            customRoleName: customRoleName,
            pharmacyRoleId: user.pharmacyRoleId || null,
            pharmacyRoleName: pharmacyRoleName,
            permissions: effectivePermissions,
            username: user.username,
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            avatarUrl: user.avatarUrl || null,
            verificationStatus: tenantVerificationStatus,
            rejectionReason: user.tenant?.rejectionReason || null,
            requiresOtp,
            paymentRequired,
            tenant: user.tenant
                ? {
                    id: user.tenant.id,
                    name: user.tenant.name,
                    logoUrl: user.tenant.logoUrl || null,
                    logoPublicId: user.tenant.logoPublicId || null,
                    email: user.tenant.email || null,
                    phone: user.tenant.phone || null,
                    address: user.tenant.address || null,
                }
                : null,
        };
        const secret = process.env.JWT_SECRET || "default_secret";
        const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: expiresIn });
        // Find pending or active subscription for checkout if needed
        const pendingSub = await prisma_1.prisma.subscription.findFirst({
            where: { tenantId: user.tenantId },
            orderBy: { createdAt: "desc" },
        });
        return {
            token,
            user: payload,
            verificationStatus: tenantVerificationStatus,
            requiresOtp,
            paymentRequired,
            rejectionReason: user.tenant?.rejectionReason || null,
            subscriptionId: pendingSub?.id || null,
        };
    }
    /**
     * Get current authenticated user with live permissions & verification status
     */
    static async getMe(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenant: true,
            },
        });
        if (!user) {
            throw new Error("User not found");
        }
        let effectivePermissions = user.permissions || [];
        let customRoleName = user.customRoleName || null;
        let pharmacyRoleName = user.pharmacyRoleName || null;
        if (user.role === "SUPER_ADMIN" || user.role === "COMPANY_OWNER") {
            effectivePermissions = ["*"];
        }
        else if (user.pharmacyRoleId) {
            try {
                const pharmacyRole = await prisma_1.prisma.pharmacyRole.findUnique({
                    where: { id: user.pharmacyRoleId },
                });
                if (pharmacyRole) {
                    pharmacyRoleName = pharmacyRole.name;
                    const combined = new Set([...(pharmacyRole.permissions || []), ...(user.permissions || [])]);
                    effectivePermissions = Array.from(combined);
                }
            }
            catch (e) { }
        }
        else if (user.customRoleId) {
            try {
                const customRole = await prisma_1.prisma.platformRole.findUnique({
                    where: { id: user.customRoleId },
                });
                if (customRole) {
                    customRoleName = customRole.name;
                    const combined = new Set([...(customRole.permissions || []), ...(user.permissions || [])]);
                    effectivePermissions = Array.from(combined);
                }
            }
            catch (e) { }
        }
        else if (effectivePermissions.length === 0 && requirePermission_1.DEFAULT_ROLE_PERMISSIONS[user.role]) {
            effectivePermissions = requirePermission_1.DEFAULT_ROLE_PERMISSIONS[user.role] || [];
        }
        const tenantVerificationStatus = user.tenant?.verificationStatus || "ACTIVE";
        const requiresOtp = user.role === "COMPANY_OWNER" && tenantVerificationStatus === "PENDING_OTP";
        const paymentRequired = user.role === "COMPANY_OWNER" && tenantVerificationStatus === "APPROVED_PENDING_PAYMENT";
        return {
            id: user.id,
            tenantId: user.tenantId,
            branchId: user.branchId,
            role: user.role,
            customRoleId: user.customRoleId || null,
            customRoleName,
            pharmacyRoleId: user.pharmacyRoleId || null,
            pharmacyRoleName,
            permissions: effectivePermissions,
            username: user.username,
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            avatarUrl: user.avatarUrl || null,
            verificationStatus: tenantVerificationStatus,
            rejectionReason: user.tenant?.rejectionReason || null,
            requiresOtp,
            paymentRequired,
        };
    }
    /**
     * Register Pharmacy Owner with Regulatory Documents, OTP dispatch, and initial verification state
     */
    static async registerOwner(data) {
        // 1. Check if email already registered
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { username: data.email },
                ],
            },
        });
        if (existingUser) {
            throw new Error("An account with this email address already exists. Please login instead.");
        }
        // 2. Upload regulatory documents to Cloudinary / storage
        // NID requires both Front and Back sides
        const nidFront = data.nidFrontDocument || data.nidDocument;
        const nidBack = data.nidBackDocument;
        // Trade License and Drug License are uploaded as a single complete document (PDF/JPG/PNG)
        const tradeDoc = data.tradeLicenseDocument || data.tradeLicenseFrontDocument;
        const tradeBack = data.tradeLicenseBackDocument;
        const drugDoc = data.drugLicenseDocument || data.drugLicenseFrontDocument;
        const drugBack = data.drugLicenseBackDocument;
        if (!nidFront) {
            throw new Error("NID Front document is required.");
        }
        if (!nidBack) {
            throw new Error("NID Back document is required.");
        }
        if (!tradeDoc) {
            throw new Error("Trade License document is required (PDF, JPG, or PNG).");
        }
        if (!drugDoc) {
            throw new Error("DGDA Drug License document is required (PDF, JPG, or PNG).");
        }
        let nidFrontUpload = { secureUrl: "", publicId: "" };
        let nidBackUpload = null;
        let tradeDocUpload = { secureUrl: "", publicId: "" };
        let tradeBackUpload = null;
        let drugDocUpload = { secureUrl: "", publicId: "" };
        let drugBackUpload = null;
        try {
            const uploadTasks = [
                upload_service_1.UploadService.uploadImage(nidFront, "pharmacy_saas/documents/nid_front"),
                upload_service_1.UploadService.uploadImage(nidBack, "pharmacy_saas/documents/nid_back"),
                tradeDoc ? upload_service_1.UploadService.uploadImage(tradeDoc, "pharmacy_saas/documents/trade") : Promise.resolve({ secureUrl: "", publicId: "" }),
                drugDoc ? upload_service_1.UploadService.uploadImage(drugDoc, "pharmacy_saas/documents/drug") : Promise.resolve({ secureUrl: "", publicId: "" }),
            ];
            if (tradeBack)
                uploadTasks.push(upload_service_1.UploadService.uploadImage(tradeBack, "pharmacy_saas/documents/trade_back"));
            else
                uploadTasks.push(Promise.resolve(null));
            if (drugBack)
                uploadTasks.push(upload_service_1.UploadService.uploadImage(drugBack, "pharmacy_saas/documents/drug_back"));
            else
                uploadTasks.push(Promise.resolve(null));
            const [nFront, nBack, tDoc, dDoc, tBack, dBack] = await Promise.all(uploadTasks);
            nidFrontUpload = nFront;
            nidBackUpload = nBack;
            tradeDocUpload = tDoc;
            drugDocUpload = dDoc;
            tradeBackUpload = tBack;
            drugBackUpload = dBack;
        }
        catch (uploadErr) {
            console.error("[registerOwner] Document upload failed:", uploadErr);
            throw new Error(`Document upload error: ${uploadErr.message || "Failed to upload regulatory documents."}`);
        }
        // 3. Resolve selected subscription plan
        let plan = null;
        if (data.planId) {
            plan = await prisma_1.prisma.subscriptionPlan.findUnique({
                where: { id: data.planId },
            });
        }
        if (!plan) {
            plan = await prisma_1.prisma.subscriptionPlan.findFirst({
                where: { tier: "STARTER", isActive: true },
            }) || await prisma_1.prisma.subscriptionPlan.findFirst({
                where: { isActive: true },
            });
        }
        // 4. Generate 6-digit OTP code with 15-minute expiration
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
        const durationDays = data.billingCycle === "YEARLY" ? 365 : 30;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Create Tenant with PENDING_OTP status and regulatory document references
            const tenant = await tx.tenant.create({
                data: {
                    name: data.companyName,
                    tier: plan ? plan.tier : "STARTER",
                    email: data.email,
                    phone: data.phone,
                    address: data.address || "HQ Location",
                    isActive: false, // Inactive until approved and paid
                    // Verification & Regulatory Documents
                    verificationStatus: "PENDING_OTP",
                    nidNumber: data.nidNumber,
                    nidDocUrl: nidFrontUpload.secureUrl,
                    nidDocPublicId: nidFrontUpload.publicId,
                    nidFrontUrl: nidFrontUpload.secureUrl,
                    nidFrontPublicId: nidFrontUpload.publicId,
                    nidBackUrl: nidBackUpload?.secureUrl || null,
                    nidBackPublicId: nidBackUpload?.publicId || null,
                    tradeLicenseNumber: data.tradeLicenseNumber,
                    tradeLicenseDocUrl: tradeDocUpload.secureUrl,
                    tradeLicenseDocPublicId: tradeDocUpload.publicId,
                    tradeLicenseFrontUrl: tradeDocUpload.secureUrl,
                    tradeLicenseFrontPublicId: tradeDocUpload.publicId,
                    tradeLicenseBackUrl: tradeBackUpload?.secureUrl || null,
                    tradeLicenseBackPublicId: tradeBackUpload?.publicId || null,
                    drugLicenseNumber: data.drugLicenseNumber,
                    drugLicenseDocUrl: drugDocUpload.secureUrl,
                    drugLicenseDocPublicId: drugDocUpload.publicId,
                    drugLicenseFrontUrl: drugDocUpload.secureUrl,
                    drugLicenseFrontPublicId: drugDocUpload.publicId,
                    drugLicenseBackUrl: drugBackUpload?.secureUrl || null,
                    drugLicenseBackPublicId: drugBackUpload?.publicId || null,
                    // OTP
                    otpCode,
                    otpExpiresAt,
                    // Pending Plan Selection
                    pendingPlanId: plan?.id,
                    pendingBillingCycle: data.billingCycle || "MONTHLY",
                },
            });
            // Create Main Branch
            const mainBranch = await tx.branch.create({
                data: {
                    tenantId: tenant.id,
                    name: "Main Branch",
                    phone: data.phone,
                    location: data.address || "HQ Location",
                    isActive: true,
                },
            });
            // Create Owner User
            const user = await tx.user.create({
                data: {
                    tenantId: tenant.id,
                    branchId: mainBranch.id,
                    username: data.email,
                    email: data.email,
                    name: data.ownerName,
                    phone: data.phone,
                    role: "COMPANY_OWNER",
                    passwordHash,
                    isActive: true,
                },
            });
            // Create Subscription (PENDING until approved & paid)
            const subscription = await tx.subscription.create({
                data: {
                    tenantId: tenant.id,
                    planId: plan ? plan.id : (await tx.subscriptionPlan.findFirst())?.id,
                    status: "PENDING",
                    startDate,
                    endDate,
                    autoRenew: false,
                },
                include: {
                    plan: true,
                },
            });
            return { tenant, user, mainBranch, subscription };
        });
        // 5. Seed default catalog variants in background
        product_service_1.ProductService.seedDefaultCatalogVariants(result.tenant.id).catch((err) => {
            console.error("[registerOwner] Error seeding default catalog variants:", err);
        });
        // 6. Send OTP verification email directly to the Pharmacy Owner's submitted email
        const ownerEmail = data.email.trim().toLowerCase();
        await email_service_1.EmailService.sendOtpEmail({
            to: ownerEmail,
            name: data.ownerName,
            otpCode,
            companyName: data.companyName,
        });
        // 7. Generate JWT token
        const payload = {
            id: result.user.id,
            tenantId: result.tenant.id,
            branchId: result.mainBranch.id,
            role: result.user.role,
            permissions: ["*"],
            username: result.user.username,
            name: result.user.name,
            email: result.user.email,
            verificationStatus: "PENDING_OTP",
            requiresOtp: true,
        };
        const secret = process.env.JWT_SECRET || "default_secret";
        const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
        const token = jsonwebtoken_1.default.sign(payload, secret, { expiresIn: expiresIn });
        return {
            token,
            user: payload,
            tenant: result.tenant,
            branch: result.mainBranch,
            subscription: result.subscription,
            verificationStatus: "PENDING_OTP",
            requiresOtp: true,
            message: "Registration submitted successfully. Please verify the 6-digit OTP sent to your email.",
        };
    }
    /**
     * Verify 6-digit email OTP
     */
    static async verifyOtp(data) {
        const { email, otpCode } = data;
        const tenant = await prisma_1.prisma.tenant.findFirst({
            where: { email },
        });
        if (!tenant) {
            throw new Error("No pharmacy registration found for this email address.");
        }
        if (tenant.verificationStatus !== "PENDING_OTP") {
            return {
                success: true,
                alreadyVerified: true,
                verificationStatus: tenant.verificationStatus,
                message: "Email has already been verified.",
            };
        }
        if (!tenant.otpCode || tenant.otpCode !== otpCode.trim()) {
            throw new Error("Invalid verification OTP code. Please check your email and try again.");
        }
        if (tenant.otpExpiresAt && new Date() > new Date(tenant.otpExpiresAt)) {
            throw new Error("This verification OTP has expired. Please click 'Resend OTP' to get a new code.");
        }
        // Mark as PENDING_APPROVAL (under Super Admin review)
        const updatedTenant = await prisma_1.prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                verificationStatus: "PENDING_APPROVAL",
                otpVerifiedAt: new Date(),
                otpCode: null,
            },
        });
        return {
            success: true,
            verificationStatus: "PENDING_APPROVAL",
            message: "Email successfully verified! Your pharmacy application is now under review by our administration team.",
            tenant: updatedTenant,
        };
    }
    /**
     * Resend 6-digit email OTP
     */
    static async resendOtp(data) {
        const { email } = data;
        const tenant = await prisma_1.prisma.tenant.findFirst({
            where: { email },
            include: { users: { where: { role: "COMPANY_OWNER" }, take: 1 } },
        });
        if (!tenant) {
            throw new Error("No pharmacy application found for this email address.");
        }
        if (tenant.verificationStatus !== "PENDING_OTP") {
            throw new Error("Email has already been verified.");
        }
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const newExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await prisma_1.prisma.tenant.update({
            where: { id: tenant.id },
            data: {
                otpCode: newOtp,
                otpExpiresAt: newExpiresAt,
            },
        });
        const ownerUser = tenant.users?.[0];
        await email_service_1.EmailService.sendOtpEmail({
            to: email,
            name: ownerUser?.name || tenant.name,
            otpCode: newOtp,
            companyName: tenant.name,
        });
        return {
            success: true,
            message: "A new 6-digit verification OTP has been sent to your email.",
        };
    }
    /**
     * Check verification and subscription status
     */
    static async getVerificationStatus(identifier) {
        const tenant = await prisma_1.prisma.tenant.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { email: identifier },
                ],
            },
            include: {
                users: { where: { role: "COMPANY_OWNER" }, take: 1 },
                subscriptions: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    include: { plan: true },
                },
            },
        });
        if (!tenant) {
            throw new Error("Application record not found.");
        }
        const latestSub = tenant.subscriptions?.[0] || null;
        const plan = latestSub?.plan || null;
        const isApproved = tenant.verificationStatus === "APPROVED_PENDING_PAYMENT";
        const isActive = tenant.verificationStatus === "ACTIVE";
        const isRejected = tenant.verificationStatus === "REJECTED";
        const isPendingApproval = tenant.verificationStatus === "PENDING_APPROVAL";
        const isPendingOtp = tenant.verificationStatus === "PENDING_OTP";
        return {
            tenantId: tenant.id,
            companyName: tenant.name,
            email: tenant.email,
            phone: tenant.phone,
            address: tenant.address,
            ownerName: tenant.users?.[0]?.name,
            verificationStatus: tenant.verificationStatus,
            // Documents (Front & Back)
            nidNumber: tenant.nidNumber,
            nidDocUrl: tenant.nidDocUrl,
            nidFrontUrl: tenant.nidFrontUrl || tenant.nidDocUrl,
            nidBackUrl: tenant.nidBackUrl,
            tradeLicenseNumber: tenant.tradeLicenseNumber,
            tradeLicenseDocUrl: tenant.tradeLicenseDocUrl,
            tradeLicenseFrontUrl: tenant.tradeLicenseFrontUrl || tenant.tradeLicenseDocUrl,
            tradeLicenseBackUrl: tenant.tradeLicenseBackUrl,
            drugLicenseNumber: tenant.drugLicenseNumber,
            drugLicenseDocUrl: tenant.drugLicenseDocUrl,
            drugLicenseFrontUrl: tenant.drugLicenseFrontUrl || tenant.drugLicenseDocUrl,
            drugLicenseBackUrl: tenant.drugLicenseBackUrl,
            // Audit info
            submittedAt: tenant.createdAt,
            otpVerifiedAt: tenant.otpVerifiedAt,
            approvedAt: tenant.approvedAt,
            approvalNotes: tenant.approvalNotes,
            rejectedAt: tenant.rejectedAt,
            rejectionReason: tenant.rejectionReason,
            // Plan & Payment info
            plan,
            subscriptionId: latestSub?.id,
            billingCycle: tenant.pendingBillingCycle,
            paymentRequired: isApproved,
            isApproved,
            isActive,
            isRejected,
            isPendingApproval,
            isPendingOtp,
        };
    }
}
exports.AuthService = AuthService;
