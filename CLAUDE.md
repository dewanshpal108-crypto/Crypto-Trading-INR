# Claude Infrastructure Controller: Crypto Orderbook & Trading Engine

This file defines the system boundaries, runtime parameters, and execution standards for Claude Code working on this Next.js/Node.js real-time high-throughput exchange application.

Import universal constraints:
@AGENTS.md

## 1. Project Context & Purpose
You are working on a high-performance crypto trading platform featuring an in-memory matching engine, time-series candle generation, and full-stack asset tracking.
* **Stack:** Next.js (App Router, TypeScript, Tailwind CSS), Node.js (Express/WS or Next.js API Routes), Prisma ORM (PostgreSQL), Redis (Sorted Sets for Live Orderbook), TimescaleDB (Hypertable for OHLCV Candles), Razorpay SDK.
* **Data Sources:** Live public market data is mirrored directly from the Binance Public API / WebSockets (`wss://stream.binance.org:9443`).

## 2. Environment Verification & Scripts
When executing terminal commands or validating codebase state, use the following standardized shell patterns:

* **Development Server:** `npm run dev`
* **Prisma Schema Generation:** `npx prisma generate`
* **Prisma Migration Run:** `npx prisma migrate dev`
* **Type-Check Codebase:** `npx tsc --noEmit`
* **Production Build Verification:** `npm run build`

## 3. Tool Execution Boundaries
* **Financial Ledger Integrity:** Do NOT mock transaction balances or trade logs. Any modifications to internal ledger states must go through Prisma schemas or explicit transactional operations (`prisma.$transaction`).
* **Environment Variables Protection:** Never expose or hardcode secrets found in `.env`. This applies heavily to `RAZORPAY_SECRET`, `DATABASE_URL`, and `REDIS_URL`.
* **Database Dual-Write Rule:** Remember that an executed trade must write a real-time event to Redis (ZSET update + Pub/Sub broadcast), append a record to the TimescaleDB transactional trade log, and update user ledger states in PostgreSQL. Ensure scripts or endpoints maintain this triple-write architecture.

## 4. Immediate Development Roadmap
Refer to these file paths when tasked with modifying specific layers:
* **Frontend Market Routing:** `app/ticker/page.tsx`, `app/spot/[market]/page.tsx`, `app/portfolio/page.tsx`
* **Charting Engine Canvas:** Look inside the `/spot` directory for the `lightweight-charts` React client component wrapper.
* **In-Memory Matching:** Backend service interacting with Redis ZSETs via `ioredis` or native redis bindings.
* **Webhook Processing:** `/api/v1/payments/razorpay/webhook` — Core cryptographic signature validations go here.