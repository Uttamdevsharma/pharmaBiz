export const attendanceSwagger = {
  paths: {
    "/api/attendance/my-history": {
      get: {
        tags: ["Attendance & HR"],
        summary: "Employee self-service: View own attendance history",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Personal attendance sheet" } },
      },
    },
    "/api/attendance/off-days": {
      get: {
        tags: ["Attendance & HR"],
        summary: "Get branch weekly & custom off-day settings",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "branchId", in: "query", schema: { type: "string" } }],
        responses: { 200: { description: "Off-day calendar configuration" } },
      },
      post: {
        tags: ["Attendance & HR"],
        summary: "Configure branch weekly off-days and public holidays",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SetBranchOffDayConfigDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                month: "2026-09",
                weeklyOffDays: ["Friday"],
                customOffDates: ["2026-09-16"],
              },
            },
          },
        },
        responses: { 200: { description: "Off-day schedule saved" } },
      },
    },
    "/api/attendance/daily": {
      get: {
        tags: ["Attendance & HR"],
        summary: "Get branch daily attendance sheet",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "date", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { 200: { description: "Daily attendance roster" } },
      },
      post: {
        tags: ["Attendance & HR"],
        summary: "Mark bulk daily attendance for staff",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MarkBulkDailyAttendanceDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                date: "2026-09-22",
                attendances: [
                  {
                    userId: "u-staff-uuid",
                    status: "PRESENT",
                  },
                ],
              },
            },
          },
        },
        responses: { 200: { description: "Attendance recorded" } },
      },
    },
    "/api/attendance/employee-history": {
      get: {
        tags: ["Attendance & HR"],
        summary: "Get monthly attendance records for staff members",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "userId", in: "query", schema: { type: "string" } },
          { name: "month", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Staff attendance history" } },
      },
    },
    "/api/attendance/salary-calc": {
      get: {
        tags: ["Attendance & HR"],
        summary: "Calculate automated monthly salary based on attendance & deductions",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "branchId", in: "query", schema: { type: "string" } },
          { name: "month", in: "query", schema: { type: "string" } },
        ],
        responses: { 200: { description: "Calculated payable salary per employee" } },
      },
    },
    "/api/attendance/summary": {
      get: {
        tags: ["Attendance & HR"],
        summary: "Branch monthly attendance summary",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Present, Absent, and Late statistics" } },
      },
    },
    "/api/attendance/allowances": {
      get: {
        tags: ["Attendance & HR"],
        summary: "List custom monthly allowances (Eid bonus, Overtime, Performance)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Allowances list" } },
      },
      post: {
        tags: ["Attendance & HR"],
        summary: "Add monthly allowance to employee",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAllowanceDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                userId: "u-staff-uuid",
                month: "2026-09",
                title: "Overtime Duty Allowance",
                amount: 1500,
              },
            },
          },
        },
        responses: { 201: { description: "Allowance added" } },
      },
    },
    "/api/attendance/allowances/{id}": {
      delete: {
        tags: ["Attendance & HR"],
        summary: "Delete allowance entry",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Allowance deleted" } },
      },
    },
    "/api/attendance/employees/{id}/deactivate": {
      post: {
        tags: ["Attendance & HR"],
        summary: "Deactivate resigned employee",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  resignationReason: { type: "string", example: "Relocated to another city" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Employee deactivated" } },
      },
    },
    "/api/attendance/employees/{id}/reactivate": {
      post: {
        tags: ["Attendance & HR"],
        summary: "Reactivate staff member",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Employee reactivated" } },
      },
    },
    "/api/attendance/deduction-rules": {
      get: {
        tags: ["Attendance & HR"],
        summary: "Get salary deduction rules (Late arrivals & unexcused leaves)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Deduction rules" } },
      },
      put: {
        tags: ["Attendance & HR"],
        summary: "Configure automated salary deduction policy",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  lateDaysForOneDaySalaryCut: { type: "integer", example: 3 },
                  unexcusedAbsentSalaryCutRate: { type: "number", example: 1.0 },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Deduction rules configured" } },
      },
    },
  },
  schemas: {
    SetBranchOffDayConfigDto: {
      type: "object",
      required: ["branchId", "month", "weeklyOffDays"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        month: { type: "string", example: "2026-09" },
        weeklyOffDays: { type: "array", items: { type: "string" }, example: ["Friday"] },
        customOffDates: { type: "array", items: { type: "string" }, example: ["2026-09-16"] },
        notes: { type: "string" },
      },
    },
    MarkBulkDailyAttendanceDto: {
      type: "object",
      required: ["branchId", "date", "attendances"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        date: { type: "string", format: "date", example: "2026-09-22" },
        attendances: {
          type: "array",
          items: {
            type: "object",
            required: ["userId", "status"],
            properties: {
              userId: { type: "string", format: "uuid" },
              status: { type: "string", enum: ["PRESENT", "ABSENT", "LATE", "PAID_LEAVE", "UNPAID_LEAVE", "OFF_DAY"] },
              notes: { type: "string" },
            },
          },
        },
      },
    },
    CreateAllowanceDto: {
      type: "object",
      required: ["branchId", "userId", "month", "title", "amount"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
        month: { type: "string", example: "2026-09" },
        title: { type: "string", example: "Overtime Duty Allowance" },
        amount: { type: "number", minimum: 0.01, example: 1500 },
        notes: { type: "string" },
      },
    },
  },
};
