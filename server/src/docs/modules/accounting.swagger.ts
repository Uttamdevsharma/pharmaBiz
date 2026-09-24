export const accountingSwagger = {
  paths: {
    "/api/accounting/overview": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "Financial overview & ledger balances",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Cash on hand, bank balances, mobile money, and recent cashflow" } },
      },
    },
    "/api/accounting/accounts": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "List financial accounts (Cash drawer, Bank, bKash, Nagad)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Accounts list" } },
      },
      post: {
        tags: ["Accounting & Payroll"],
        summary: "Create financial account",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateAccountDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                name: "Cash Drawer 01",
                type: "CASH",
                isDefault: true,
                initialBalance: 5000,
              },
            },
          },
        },
        responses: { 201: { description: "Account created" } },
      },
    },
    "/api/accounting/accounts/{id}": {
      patch: {
        tags: ["Accounting & Payroll"],
        summary: "Update financial account",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/CreateAccountDto" } } } },
        responses: { 200: { description: "Account updated" } },
      },
      delete: {
        tags: ["Accounting & Payroll"],
        summary: "Delete financial account",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Account deleted" } },
      },
    },
    "/api/accounting/accounts/deposit": {
      post: {
        tags: ["Accounting & Payroll"],
        summary: "Deposit funds into account",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["accountId", "amount"],
                properties: {
                  accountId: { type: "string", format: "uuid" },
                  amount: { type: "number", minimum: 0.01, example: 10000 },
                  description: { type: "string", example: "Capital injection" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Funds deposited" } },
      },
    },
    "/api/accounting/transfer": {
      post: {
        tags: ["Accounting & Payroll"],
        summary: "Double-entry transfer funds between accounts",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TransferFundsDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                sourceAccountId: "acc-cash-uuid",
                destinationAccountId: "acc-bank-uuid",
                amount: 15000,
                note: "Evening cash deposit into Dutch Bangla Bank",
              },
            },
          },
        },
        responses: { 200: { description: "Funds transferred" } },
      },
    },
    "/api/accounting/transactions": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "List ledger journal transactions",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "type", in: "query", schema: { type: "string", enum: ["INCOME", "EXPENSE", "TRANSFER", "SALE_PAYMENT", "PURCHASE_PAYMENT", "REFUND"] } },
        ],
        responses: { 200: { description: "Journal transactions list" } },
      },
      post: {
        tags: ["Accounting & Payroll"],
        summary: "Record custom Income / Expense journal transaction",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecordTransactionDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                accountId: "acc-cash-uuid",
                amount: 300,
                type: "EXPENSE",
                reference: "PETTY-012",
                note: "Emergency cleaning supplies",
              },
            },
          },
        },
        responses: { 201: { description: "Transaction recorded" } },
      },
    },
    "/api/accounting/daily-sales": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "Daily sales register audit",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Daily register sales reconciliation" } },
      },
    },
    "/api/accounting/recurring-expenses": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "List recurring monthly expense templates (Rent, Bills)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Recurring expenses list" } },
      },
      post: {
        tags: ["Accounting & Payroll"],
        summary: "Create recurring expense configuration",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateRecurringExpenseDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                category: "SHOP_RENT",
                title: "Monthly Pharmacy Shop Rent",
                estimatedAmount: 25000,
                dueDay: 5,
              },
            },
          },
        },
        responses: { 201: { description: "Recurring expense created" } },
      },
    },
    "/api/accounting/recurring-expenses/{id}": {
      put: {
        tags: ["Accounting & Payroll"],
        summary: "Update recurring expense configuration",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/CreateRecurringExpenseDto" } } } },
        responses: { 200: { description: "Recurring expense updated" } },
      },
      delete: {
        tags: ["Accounting & Payroll"],
        summary: "Delete recurring expense configuration",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Recurring expense deleted" } },
      },
    },
    "/api/accounting/expenses": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "List paid expenses",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "expenseMonth", in: "query", schema: { type: "string" }, example: "2026-09" },
        ],
        responses: { 200: { description: "Expenses list" } },
      },
      post: {
        tags: ["Accounting & Payroll"],
        summary: "Record monthly bill / overhead payment",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RecordExpensePaymentDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                financialAccountId: "acc-bank-uuid",
                category: "ELECTRICITY_BILL",
                title: "DESCO Electricity Bill - September",
                expenseMonth: "2026-09",
                amount: 6200,
                voucherNo: "V-9901",
              },
            },
          },
        },
        responses: { 201: { description: "Expense recorded and account balance deducted" } },
      },
    },
    "/api/accounting/expenses/summary": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "Expenses summary by category",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Category-wise expense totals" } },
      },
    },
    "/api/accounting/salaries/employees": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "List branch staff salary configurations",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Employee salary details" } },
      },
    },
    "/api/accounting/salaries/config": {
      post: {
        tags: ["Accounting & Payroll"],
        summary: "Set employee salary structure",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SetSalaryConfigDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                userId: "u-staff-uuid",
                baseSalary: 18000,
                allowances: 2000,
                deductions: 500,
              },
            },
          },
        },
        responses: { 200: { description: "Salary structure saved" } },
      },
    },
    "/api/accounting/salaries/disburse": {
      post: {
        tags: ["Accounting & Payroll"],
        summary: "Disburse monthly staff salary",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/DisburseSalaryDto" },
              example: {
                branchId: "b3f0e75a-4cb7-4c31-b0db-6e6ad95ff091",
                userId: "u-staff-uuid",
                financialAccountId: "acc-bank-uuid",
                month: "2026-09",
                paidAmount: 19500,
                paymentRef: "SAL-202609-01",
              },
            },
          },
        },
        responses: { 200: { description: "Salary disbursed" } },
      },
    },
    "/api/accounting/salaries/branch-history": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "Branch salary disbursement history",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Branch payroll history" } },
      },
    },
    "/api/accounting/salaries/history/{userId}": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "Specific employee salary history",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Employee salary history" } },
      },
    },
    "/api/accounting/salaries/my-history": {
      get: {
        tags: ["Accounting & Payroll"],
        summary: "Self-service: My salary slip history",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "User's personal pay slips" } },
      },
    },
  },
  schemas: {
    CreateAccountDto: {
      type: "object",
      required: ["branchId", "name", "type"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        name: { type: "string", example: "Cash Drawer 01" },
        type: { type: "string", enum: ["CASH", "BANK", "BKASH", "NAGAD", "MOBILE", "CARD_SETTLEMENT", "OTHER"] },
        accountNumber: { type: "string" },
        bankName: { type: "string" },
        branchName: { type: "string" },
        isDefault: { type: "boolean", default: false },
        initialBalance: { type: "number", default: 0 },
      },
    },
    TransferFundsDto: {
      type: "object",
      required: ["branchId", "sourceAccountId", "destinationAccountId", "amount"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        sourceAccountId: { type: "string", format: "uuid" },
        destinationAccountId: { type: "string", format: "uuid" },
        amount: { type: "number", minimum: 0.01, example: 15000 },
        note: { type: "string" },
      },
    },
    RecordTransactionDto: {
      type: "object",
      required: ["branchId", "accountId", "amount", "type"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        accountId: { type: "string", format: "uuid" },
        amount: { type: "number", minimum: 0.01, example: 300 },
        type: { type: "string", enum: ["INCOME", "EXPENSE", "SALE_PAYMENT", "PURCHASE_PAYMENT", "REFUND"] },
        reference: { type: "string" },
        note: { type: "string" },
      },
    },
    CreateRecurringExpenseDto: {
      type: "object",
      required: ["branchId", "title"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        category: { type: "string", enum: ["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"] },
        title: { type: "string", example: "Shop Rent" },
        estimatedAmount: { type: "number", example: 25000 },
        dueDay: { type: "integer", minimum: 1, maximum: 31, example: 5 },
      },
    },
    RecordExpensePaymentDto: {
      type: "object",
      required: ["branchId", "financialAccountId", "title", "expenseMonth", "amount"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        financialAccountId: { type: "string", format: "uuid" },
        category: { type: "string", enum: ["SHOP_RENT", "ELECTRICITY_BILL", "INTERNET_BILL", "SECURITY_GUARD", "MAINTENANCE", "EMPLOYEE_SALARY", "OTHER"] },
        title: { type: "string", example: "Electricity Bill" },
        expenseMonth: { type: "string", example: "2026-09" },
        amount: { type: "number", minimum: 0.01, example: 6200 },
        voucherNo: { type: "string" },
      },
    },
    SetSalaryConfigDto: {
      type: "object",
      required: ["branchId", "userId", "baseSalary"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
        baseSalary: { type: "number", minimum: 0, example: 18000 },
        allowances: { type: "number", default: 0, example: 2000 },
        deductions: { type: "number", default: 0, example: 500 },
      },
    },
    DisburseSalaryDto: {
      type: "object",
      required: ["branchId", "userId", "financialAccountId", "month", "paidAmount"],
      properties: {
        branchId: { type: "string", format: "uuid" },
        userId: { type: "string", format: "uuid" },
        financialAccountId: { type: "string", format: "uuid" },
        month: { type: "string", example: "2026-09" },
        paidAmount: { type: "number", minimum: 0.01, example: 19500 },
        paymentRef: { type: "string" },
      },
    },
  },
};
