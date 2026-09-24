export const authSwagger = {
  paths: {
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login with email/username and password",
        description: "Authenticates a user and returns a signed JWT access token along with user profile, assigned roles, permissions, and tenant details.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginDto" },
              example: {
                email: "owner@pharmabiz.com",
                password: "Password123!",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authentication successful",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                        user: { $ref: "#/components/schemas/UserResponseDto" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Validation error (missing username/email or password)" },
          401: { description: "Invalid credentials or unauthorized account status" },
        },
      },
    },
    "/api/auth/register-owner": {
      post: {
        tags: ["Authentication"],
        summary: "Register new pharmacy organization and owner account",
        description: "Creates a new tenant and owner user, initiates email OTP verification, and sets verification status to PENDING_OTP.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterOwnerDto" },
              example: {
                companyName: "Green Care Pharmacy Ltd",
                ownerName: "Dr. Rafiqul Islam",
                email: "rafiq@greencare.com",
                phone: "01712345678",
                password: "SecurePassword123!",
                address: "Plot 12, Road 4, Dhanmondi, Dhaka",
                nidNumber: "19852691234567890",
                tradeLicenseNumber: "TRAD/DNCC/023941/2024",
                drugLicenseNumber: "DL-DHAKA-2024-8849",
                billingCycle: "MONTHLY",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Owner registered successfully; OTP email dispatched",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseSuccess" },
              },
            },
          },
          400: { description: "Validation error or email/company already in use" },
        },
      },
    },
    "/api/auth/verify-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Verify email OTP code",
        description: "Validates the 4-6 digit numeric OTP code sent to the pharmacy owner email during registration.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyOtpDto" },
              example: {
                email: "rafiq@greencare.com",
                otpCode: "123456",
              },
            },
          },
        },
        responses: {
          200: {
            description: "OTP verified successfully. Tenant status updated to PENDING_APPROVAL.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiResponseSuccess" },
              },
            },
          },
          400: { description: "Invalid or expired OTP code" },
        },
      },
    },
    "/api/auth/resend-otp": {
      post: {
        tags: ["Authentication"],
        summary: "Resend registration OTP code",
        description: "Generates a new verification OTP and sends it via email.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResendOtpDto" },
              example: {
                email: "rafiq@greencare.com",
              },
            },
          },
        },
        responses: {
          200: { description: "New OTP code sent successfully" },
          400: { description: "Account already verified or invalid email" },
        },
      },
    },
    "/api/auth/verification-status": {
      get: {
        tags: ["Authentication"],
        summary: "Check pharmacy verification status",
        description: "Retrieves verification lifecycle stage: PENDING_OTP, PENDING_APPROVAL, APPROVED_PENDING_PAYMENT, ACTIVE, or REJECTED.",
        parameters: [
          {
            name: "identifier",
            in: "query",
            required: false,
            description: "Email or Tenant ID of the registered pharmacy",
            schema: { type: "string", example: "rafiq@greencare.com" },
          },
          {
            name: "email",
            in: "query",
            required: false,
            description: "Email address alias for identifier",
            schema: { type: "string" },
          },
          {
            name: "tenantId",
            in: "query",
            required: false,
            description: "Tenant UUID alias for identifier",
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Current verification status retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: {
                      type: "object",
                      properties: {
                        tenantId: { type: "string", example: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091" },
                        status: { type: "string", example: "APPROVED_PENDING_PAYMENT" },
                        companyName: { type: "string", example: "Green Care Pharmacy Ltd" },
                        isEmailVerified: { type: "boolean", example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Identifier missing or not found" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current authenticated user profile",
        description: "Returns currently logged-in user profile, roles, branch assignment, permissions, and tenant subscription status.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Authenticated user profile",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    data: { $ref: "#/components/schemas/UserResponseDto" },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized - Token missing or expired" },
        },
      },
    },
  },
  schemas: {
    LoginDto: {
      type: "object",
      required: ["password"],
      properties: {
        email: {
          type: "string",
          format: "email",
          description: "Registered email address (either email or username is required)",
          example: "owner@pharmabiz.com",
        },
        username: {
          type: "string",
          description: "Staff username (either email or username is required)",
          example: "owner123",
        },
        password: {
          type: "string",
          format: "password",
          minLength: 6,
          description: "Account password",
          example: "Password123!",
        },
      },
    },
    RegisterOwnerDto: {
      type: "object",
      required: [
        "companyName",
        "ownerName",
        "email",
        "phone",
        "password",
        "nidNumber",
        "tradeLicenseNumber",
        "drugLicenseNumber",
      ],
      properties: {
        companyName: { type: "string", minLength: 2, example: "Green Care Pharmacy Ltd" },
        ownerName: { type: "string", minLength: 2, example: "Dr. Rafiqul Islam" },
        email: { type: "string", format: "email", example: "rafiq@greencare.com" },
        phone: { type: "string", minLength: 5, example: "01712345678" },
        password: { type: "string", format: "password", minLength: 6, example: "SecurePass123!" },
        address: { type: "string", example: "Plot 12, Road 4, Dhanmondi, Dhaka" },
        nidNumber: { type: "string", minLength: 4, example: "19852691234567890" },
        nidFrontDocument: { type: "string", format: "uri", example: "https://res.cloudinary.com/.../nid_front.jpg" },
        nidBackDocument: { type: "string", format: "uri", example: "https://res.cloudinary.com/.../nid_back.jpg" },
        tradeLicenseNumber: { type: "string", minLength: 4, example: "TRAD/DNCC/023941/2024" },
        tradeLicenseFrontDocument: { type: "string", format: "uri", example: "https://res.cloudinary.com/.../trade_license.pdf" },
        drugLicenseNumber: { type: "string", minLength: 4, example: "DL-DHAKA-2024-8849" },
        drugLicenseFrontDocument: { type: "string", format: "uri", example: "https://res.cloudinary.com/.../drug_license.pdf" },
        planId: { type: "string", format: "uuid", example: "d6f5c8d0-e190-4a8b-a25e-324227f4d2f1" },
        billingCycle: { type: "string", enum: ["MONTHLY", "YEARLY"], default: "MONTHLY" },
      },
    },
    VerifyOtpDto: {
      type: "object",
      required: ["email", "otpCode"],
      properties: {
        email: { type: "string", format: "email", example: "rafiq@greencare.com" },
        tenantId: { type: "string", format: "uuid", example: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091" },
        otpCode: { type: "string", minLength: 4, maxLength: 6, example: "123456" },
      },
    },
    ResendOtpDto: {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string", format: "email", example: "rafiq@greencare.com" },
      },
    },
    UserResponseDto: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid", example: "u-1234-5678" },
        name: { type: "string", example: "Dr. Rafiqul Islam" },
        email: { type: "string", example: "rafiq@greencare.com" },
        role: { type: "string", example: "COMPANY_OWNER" },
        tenantId: { type: "string", example: "t-9876-5432" },
        branchId: { type: "string", nullable: true, example: "b-5555-4444" },
        isActive: { type: "boolean", example: true },
        permissions: {
          type: "array",
          items: { type: "string" },
          example: ["inventory.manage", "pos.manage", "reports.view"],
        },
      },
    },
  },
};
