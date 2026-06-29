<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Universal Agent Development Brief: Real-Time Trading Platform

This document serves as the absolute rulebook for all AI coding agents working within this repository. Follow these architectural patterns, optimization criteria, and system schemas strictly.

---

## 1. Core Architectural Constraints

### ⚡ The Orderbook Engine (Redis In-Memory)
* **Data Structure:** Bids and Asks are tracked inside Redis Sorted Sets (`ZSET`).
* **Sorting Rule:** 
  * **Bids (Buys):** Sorted by price **descending** (Highest willing buyers at the top).
  * **Asks (Sells):** Sorted by price **ascending** (Lowest willing sellers at the top).
* **Latency Rule:** Real-time updates must be pushed via WebSockets to listeners immediately upon Redis state adjustment. Do not poll.

### 📈 Time-Series Candle Factory (TimescaleDB)
* **Ingestion:** Raw transactional trade execution data streams directly into a TimescaleDB hypertable.
* **Aggregation:** Do not write manual math arrays to generate 5m, 1h, or 1d candles on the backend. Use **TimescaleDB Continuous Aggregations** tracking the hypertable.
* **Frontend Charting:** All historical data is visualized via `@tradingview/lightweight-charts`. Keep canvas updates light; process real-time updates directly via the WebSocket feed onto the chart series instance.

### 🏛️ Core Financial Ledger (PostgreSQL via Prisma)
* **Source of Truth:** Tracks user balances, bank nodes, order execution histories, and verification statuses.
* **Transactional Safety:** Wallet updates (deducting INR/Crypto or adding asset weights) and order placement entries **MUST** execute inside an atomic database transaction block to prevent race conditions or double-spend vulnerabilities.

---

## 2. Directory Structure & Routing Matrix
Maintain this layout convention exactly across the Next.js application framework:

* `/ticker` — Market landing grid. Displays trade pairs (e.g., BTC/INR, SOL/INR), 24h volume stats, and percentage swings.
* `/spot/[market]` — The trading interface. Contains the live orderbook streams (left), TradingView canvas chart (center), and order execution configurations with allocation sliders (right).
* `/portfolio` — Current asset breakdowns, donut distribution charts, and realized/unrealized PnL summary frames.
* `/profile/history` — Tabbed audit UI parsing Order Fulfillments, Deposit Logs, and Withdrawal tracking metrics.
* `/add-balance` — Client-side entry portal housing the inline native Razorpay Javascript Checkout script interface.

---

## 3. Strict API & Payload Contracts

### Public Interface
* `GET /api/v1/markets` -> Lists all active trade symbols, historical baseline indices, and rolling spreads.
* `GET /api/v1/charts?symbol=&resolution=&from=&to=` -> Fetches OHLCV records mapped straight from TimescaleDB aggregates.
* `GET /api/v1/orderbook?symbol=` -> Extracts a 50-level top depth layer slice out of the active Redis ZSET.

### Private Authenticated Interface
* `GET /api/v1/portfolio/balances` -> Inspects verified user financial metrics from PostgreSQL.
* `POST /api/v1/orders/place` -> Accepts the matching parameter payload:
  ```json
  { "symbol": "SOL_INR", "side": "BUY", "type": "LIMIT", "price": "12500.00", "quantity": "1.5" }