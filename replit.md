# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Oil Products Trading Platform with WhatsApp Bot integration.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (admin panel)
- **WhatsApp**: 360dialog API

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Architecture

### Admin Panel (`artifacts/admin-panel`)
- React + Vite app at `/`
- Pages: Dashboard, Users/KYC, Products, Purchase Requests (with detail pages)
- Uses React Query hooks from `@workspace/api-client-react`

### API Server (`artifacts/api-server`)
- Express 5 server at `/api`
- Routes: users, products, purchase-requests, dashboard, webhook (WhatsApp)
- WhatsApp webhook: POST/GET `/api/webhook/whatsapp`

### Database (`lib/db`)
- Tables: users, products, purchase_requests

## Environment Variables Required

- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `DIALOG360_API_KEY` — 360dialog API key for WhatsApp messaging
- `DIALOG360_API_URL` — 360dialog API URL (default: https://waba.360dialog.io/v1/messages)
- `WHATSAPP_VERIFY_TOKEN` — Webhook verify token (default: oiltrading_verify_token)

## WhatsApp Bot Flow

1. User messages bot → selects role (Seller/Buyer/Broker)
2. Bot collects KYC info step-by-step (company info for sellers/buyers, personal info for brokers)
3. Registration sent to admin for approval via admin panel
4. After admin approval, buyers can list/request products
5. Purchase requests go to admin for final approval

## User Roles

- **Seller**: Company KYC + product listings (reviewed by admin)
- **Buyer**: Company KYC + can browse/request approved products
- **Broker**: Personal info (name, phone, national ID, email)

## Admin Approval Flow

1. User registers → status=pending
2. Admin approves/rejects → user notified
3. Seller lists product → status=pending
4. Admin approves/rejects/edits price → visible to buyers
5. Buyer requests purchase → status=pending
6. Admin approves/rejects → all parties notified

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
