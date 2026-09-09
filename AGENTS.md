# AGENTS.md

Multi-tenant SaaS pharmacy management platform. Two independent packages: `client/` (Next.js) and `server/` (Express + Prisma). No shared workspace config — each has its own `package.json` and lockfile.

## Commands

### Server (`server/`)
```bash
cd server
npm install
npm run dev          # tsx watch src/app.ts (port 3000)
npm run build        # tsc → dist/
npm start            # node dist/app.js
npx prisma migrate dev   # apply migrations
npx prisma generate      # regenerate client after schema changes
```
- No test suite configured (script is a placeholder).
- `server/test-full-operations.ts` exists but is not wired into any test runner.

### Client (`client/`)
```bash
cd client
npm install
npm run dev          # Next.js dev on port 3001 (predev cleans .next_dev cache)
npm run build        # production build (prebuild cleans .next cache)
npm start            # production server on port 3001
npm run lint         # next lint
```
- Dev and prod build caches are isolated: `.next_dev` vs `.next`.
- Lint config: `.eslintrc.json` — `@typescript-eslint/no-explicit-any` is OFF.

## Architecture

### Server
- **Entry**: `src/app.ts` — Express app, mounts all `/api/*` routes.
- **Modules**: `src/modules/{module}/` — each has `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.validation.ts`, `*.types.ts`.
- **Middleware stack** (applied per-route, not globally):
  1. `authenticate` — JWT Bearer token → `req.user`
  2. `authorize(roles[])` — role-based gate
  3. `requirePermission("resource.action")` — granular permission check (resolves from JWT → DB user → pharmacy roles → platform roles → default role matrix)
  4. `requireActiveSubscription` — subscription tier gate (bypassed for SUPER_ADMIN, CTO, PROJECT_MANAGER)
  5. `validateRequest({ body, query, params })` — Zod schema validation
- **Prisma**: Schema split across `prisma/schema/*.prisma` (15 files). Entry: `prisma/schema/schema.prisma` defines generator + datasource. Config: `prisma.config.ts`.
- **DB**: PostgreSQL via `@prisma/adapter-pg` (PrismaPg driver adapter with pg Pool). Client singleton in `src/app/lib/prisma.ts`.
- **CORS**: Wide open (`*`) — dev only, do not tighten without understanding all callers.
- **Seeding**: `seedSuperAdmin()` runs on server start (`src/app/lib/seedAdmin.ts`).

### Client
- **App Router** (`src/app/`): `/login`, `/register`, `/verification-status`, `/payment`, `/admin`, `/dashboard`.
- **Layout**: `layout.tsx` → `<Providers>` (AuthProvider + SettingsProvider).
- **API client**: `src/lib/api.ts` — `fetchApi<T>(endpoint, options)` handles Bearer token from localStorage and prepends `NEXT_PUBLIC_API_URL` (default `http://localhost:3000/api`).
- **Path alias**: `@/*` → `./src/*`.
- **Styling**: Tailwind CSS v3 with `darkMode: "class"`. Brand colors use CSS custom properties (`--primary-color`).

### Multi-Tenant Data Model
- Tenants own branches, users, products, subscriptions, etc. All tenant-scoped tables have `tenantId` FK.
- User roles: `SUPER_ADMIN`, `COMPANY_OWNER`, `BRANCH_MANAGER`, `INVENTORY_EXECUTIVE`, `CASHIER`, `ACCOUNTS`, `REGIONAL_ADMIN`, `AUDITOR`, `CTO`, `PROJECT_MANAGER`.
- Permission aliases exist (e.g., `"stock.manage"` grants `"inventory.transfer"`) — see `src/middleware/requirePermission.ts`.
- Subscription tiers: `TRIAL`, `STARTER`, `GROWTH`, `ENTERPRISE`. Limits defined in `src/app/lib/planLimits.ts`.

### Tenant Verification Flow
`PENDING_OTP` → `PENDING_APPROVAL` → `APPROVED_PENDING_PAYMENT` → `ACTIVE` (or `REJECTED`)

## Gotchas

- Server Prisma calls use `(prisma as any)` extensively — the generated client types may not match the split schema. If you see type errors on Prisma calls, this is expected.
- `npm run dev` on the client runs `predev` which deletes `.next_dev` — slow first start is normal.
- No CI/CD pipelines found. No GitHub Actions, no pre-commit hooks.
- Server has no test runner. Any testing must be done manually or by adding a framework.
- Environment variables required: `DATABASE_URL`, `JWT_SECRET`, Cloudinary credentials, SMTP settings (for OTP emails). Server reads `.env` via `dotenv/config`. Client needs `NEXT_PUBLIC_API_URL`.
- Payment gateway callbacks hit root `/payment/*` routes (not under `/api/`) — see `app.ts` lines 88-90.
- The `role` field on `User` is an enum (`RoleName`), but `customRoleId`/`pharmacyRoleId` allow runtime role composition. Permission resolution order: JWT permissions → DB user permissions → pharmacy role → platform role → `RolePermission` table → `DEFAULT_ROLE_PERMISSIONS` fallback.
