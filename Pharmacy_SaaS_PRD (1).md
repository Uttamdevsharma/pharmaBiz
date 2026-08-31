# Product Requirements Document (PRD)
## Multi-Tenant SaaS Pharmacy Management System

**Version:** 1.0
**Prepared for:** Engineering Team (Junior-friendly)
**Status:** Draft for review

---

## 1. Executive Summary

We are building a **multi-tenant, offline-first pharmacy management platform**. One piece of software will be sold to many different pharmacy companies ("tenants"). Each tenant can have one or more physical branches (stores). Branches must be able to keep selling medicine even when the internet is down, and everything must sync back to the cloud once the connection returns.

Think of it as: **Cloud HQ (brain) → Event Broker (postal service) → Branches (stores with their own local brain and security guard)**.

---

## 2. Goals & Objectives

- Let a single codebase/infrastructure serve **hundreds of pharmacy companies** without their data ever mixing (multi-tenancy).
- Guarantee a branch **never stops selling** because of a lost internet connection (offline-first).
- Enforce **role-based access control (RBAC)** everywhere, including offline, so unauthorized actions (e.g., refunds, controlled-substance sales) are blocked even with zero internet.
- Provide **centralized pricing, catalog, and reporting** (including VAT/MIS reports) that every branch automatically inherits.
- Support **tiered pricing plans** (Starter / Growth / Enterprise) that unlock more branches and more advanced features as a customer grows.

---

## 3. User Roles & Permissions (RBAC Hierarchy)

| Role | Level | Scope | Key Permissions |
|---|---|---|---|
| **Super Admin** | Platform (us, the SaaS provider) | All tenants | Create/suspend tenants, manage billing plans, view platform-wide analytics, no access to tenant sales data |
| **Company Owner / Admin** | Tenant | One company, all its branches | Manage catalog & pricing, manage branches, manage all staff roles, view company-wide reports |
| **Regional Admin** *(Growth tier+)* | Tenant | A group of branches | Approve inter-branch inventory transfers, view regional reports, manage branch managers |
| **Branch Manager** | Branch | One branch | Manage local staff schedules, approve refunds/voids, view branch-level reports, adjust local stock counts |
| **Cashier / Staff** | Branch | One branch, POS only | Process sales, look up stock, cannot delete records, cannot issue refunds without manager approval |
| **Auditor (read-only)** *(Enterprise tier)* | Tenant | One company | View-only access to sales, inventory, and compliance reports (for pharmacy/controlled-substance audits) |

**Rule:** Every role above is checked **twice** — once in the cloud (server-side, source of truth) and once locally at the branch by the offline "auth proxy," so permissions still work with no internet.

---

## 4. System Architecture Overview

### 4.1 Cloud HQ (always online)
- **API Gateway** — single entry point for every request; routes to the correct service.
- **Identity & RBAC Service** — authentication (login), authorization (role checks), issues JWT tokens.
- **Master Data Service** — source of truth for product catalog, pricing, and tenant configuration.
- **Analytics/Reporting Service** — generates sales reports, VAT/MIS summaries, and dashboards.
- **Global Database** — one PostgreSQL instance, **one schema per tenant** (hard data wall between companies).

### 4.2 Event Broker (Kafka or RabbitMQ)
- Queues messages both directions:
 - Cloud → Branch: price updates, new staff permissions, promotions.
 - Branch → Cloud: completed sales, stock adjustments, sync logs.
- Decouples cloud and branches so neither has to wait on the other.

### 4.3 Branch / Edge (offline-first)
- **POS App** — handles counter sales, printing receipts.
- **Inventory App** — tracks stock levels and medicine expiry dates.
- **Local Auth Proxy** — a lightweight, locally cached copy of RBAC rules; validates login tokens with zero internet.
- **Local Database (SQLite)** — stores sales, stock changes, and a sync queue until the connection returns.
- **Sync Agent** — background process that pushes queued local changes to Kafka and pulls down new cloud data when online.

### 4.4 Multi-Tenancy Wall
- Every service (Identity, Master Data, Analytics) is **tenant-aware**: every query is automatically scoped to the logged-in user's company.
- Database-level isolation (schema-per-tenant) is the last line of defense even if application code has a bug.

---

## 5. Functional Requirements

### 5.1 Tenant & Branch Management
- Super Admin can onboard a new tenant and assign a pricing tier.
- Company Owner can add/remove branches (up to their tier's limit).
- Each branch gets a unique ID and its own local SQLite instance on first setup.

### 5.2 Point of Sale (POS)
- Search products by name/barcode.
- Apply tenant-wide pricing and any branch-specific discounts.
- Process cash/card/mobile payments.
- Print/email receipts.
- Works fully offline; queues the transaction for sync.
- Flags controlled/prescription-only medicine and requires manager/pharmacist approval.

### 5.3 Inventory Management
- Track stock per branch (not shared across branches unless transferred).
- Expiry date tracking with low-stock and near-expiry alerts.
- Inter-branch stock transfer requests (Growth tier+, requires Regional Admin approval).
- Automatic stock deduction on each sale.

### 5.4 Catalog & Pricing
- Central catalog managed by Company Owner/Admin, pushed down to all branches.
- Support for branch-level price overrides (optional, tier-dependent).
- Bulk import/update via CSV or admin dashboard.

### 5.5 Identity & Access
- Login via username/password or SSO (Enterprise tier).
- JWT-based sessions, refreshable and cacheable offline for a limited grace period.
- Role assignment restricted to Owner/Admin and above.

### 5.6 Sync Engine
- Two-way sync via event broker.
- Conflict resolution rule: cloud pricing/catalog always wins; local sales are always additive (never overwritten).
- Sync status indicator visible to branch staff (online/offline/syncing).
- Retry with exponential backoff if sync fails.

### 5.7 Reporting & Analytics
- Daily/weekly/monthly sales reports per branch, region, and company-wide.
- VAT/MIS compliance reports (Enterprise tier includes customizable report templates).
- Audit trail: who did what, when, from which branch/device.

### 5.8 Billing & Pricing Tiers

| Feature | Starter | Growth | Enterprise |
|---|---|---|---|
| Branches | 1–3 | 4–20 | 21+ |
| Server | Shared | Shared | Dedicated |
| RBAC depth | 3 roles | + Regional Admin | Custom roles |
| Inventory transfers | ✗ | ✓ | ✓ |
| API access | ✗ | ✗ | ✓ |
| Audit/compliance reports | Basic | Standard | Custom |

### 5.9 Notifications
- Low stock, expiry warnings, failed sync alerts (email/SMS/in-app).

---

## 6. Non-Functional Requirements

- **Offline resilience:** Branch must remain 100% functional for POS/inventory with zero internet for at least 72 hours.
- **Data isolation:** No tenant can query or view another tenant's data under any circumstance.
- **Security:** All traffic over HTTPS/TLS; JWT expiry and rotation; passwords hashed (bcrypt/argon2); local SQLite encrypted at rest.
- **Performance:** POS transaction must complete locally in under 1 second, regardless of cloud connectivity.
- **Scalability:** Cloud services must scale horizontally to support hundreds of tenants and thousands of branches.
- **Auditability:** Every RBAC-gated action logged with timestamp, user, and branch, both locally and in the cloud.

---

## 7. High-Level Data Model

- `tenants` (company info, pricing tier)
- `branches` (belongs to tenant)
- `users` (belongs to tenant, has role, assigned to branch or region)
- `products` (belongs to tenant catalog)
- `inventory` (belongs to branch, references product)
- `sales` (belongs to branch, references user, products)
- `sync_log` (tracks what's been pushed/pulled per branch)
- `roles_permissions` (defines what each role can do)

---

## 8. Suggested Tech Stack

- **Backend (Cloud):** Node.js/NestJS or Django, REST/GraphQL API Gateway
- **Database:** PostgreSQL (schema-per-tenant)
- **Event Broker:** Apache Kafka (or RabbitMQ for smaller scale)
- **Branch Local DB:** SQLite
- **Frontend (POS/Inventory apps):** React or React Native (for tablet-based POS)
- **Auth:** JWT + OAuth2/SSO for Enterprise
- **Infra:** Docker + Kubernetes, hosted on AWS/GCP/Azure

---

## 9. Project Phases & Timeline

Assumes a small team (2–4 engineers) working standard business days. Adjust based on actual team size.

| Phase | Deliverables | Working Days |
|---|---|---|
| **Phase 0: Planning & Design** | Finalize PRD, data model, API contracts, UI wireframes | 5 days |
| **Phase 1: Core Cloud Backend** | API Gateway, Identity/RBAC, Master Data service, tenant schema setup | 10 days |
| **Phase 2: Event Broker & Sync Design** | Kafka setup, sync protocol, conflict-resolution rules | 7 days |
| **Phase 3: Branch Edge App (Offline Core)** | Local SQLite schema, local auth proxy, sync agent | 10 days |
| **Phase 4: POS App** | Sales flow, receipts, offline queueing | 8 days |
| **Phase 5: Inventory App** | Stock tracking, expiry alerts, transfer requests | 6 days |
| **Phase 6: Admin Dashboard (Cloud)** | Tenant/branch management, catalog editor, role management | 8 days |
| **Phase 7: Reporting & Analytics** | Sales reports, VAT/MIS reports, audit trail | 6 days |
| **Phase 8: Billing & Tier Enforcement** | Tier limits, feature gating, upgrade flow | 4 days |
| **Phase 9: QA & Offline Resilience Testing** | Simulate network loss, conflict scenarios, load testing | 7 days |
| **Phase 10: Pilot & Launch** | Onboard 1–2 pilot tenants, monitor, fix issues | 5 days |

**Total estimated timeline: ~76 working days (~15–16 weeks)** for a small team, assuming no major scope changes.

---

## 10. Success Metrics

- Zero data leakage between tenants (verified via security audit).
- Branch POS uptime of 100% regardless of internet status.
- Sync completion within 60 seconds of reconnection for a typical branch.
- Successful onboarding of pilot tenants across all three pricing tiers.

---

## 11. Risks & Assumptions

- **Risk:** Sync conflicts if a product is edited centrally while a branch is offline for a long time — mitigated by "cloud catalog always wins" rule.
- **Risk:** Local SQLite corruption on branch device — mitigated by periodic local backups and sync logs.
- **Assumption:** Branch devices are single-purpose (dedicated POS hardware/tablet), not shared general-purpose computers.
- **Assumption:** Regulatory/VAT reporting formats will be confirmed with a compliance stakeholder before Phase 7.

---

*This PRD consolidates the architecture, roles, and tier structure discussed earlier, and is intended to be detailed enough for a junior engineer to understand the full system end to end. Follow up with API contract specs and UI wireframes before Phase 1 begins.*
