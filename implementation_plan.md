# Crypto Trading Platform — Implementation Plan

## Current State

You have a working foundation:
- ✅ Next.js 16 App Router + TypeScript + Tailwind CSS
- ✅ Prisma ORM with PostgreSQL (User, Order, fills, stocks models)
- ✅ Auth: Signup/Login server actions with bcrypt + JWT generation
- ✅ Redux Toolkit store with auth slice
- ✅ Basic profile page reading from Redux

**What's missing** (mapped against your architecture spec):

| Layer | Status | What Needs Building |
|---|---|---|
| Prisma Schema | 🟡 Partial | Wallet/Balance model, Trade history, Razorpay transactions, relations between models |
| API Routes | 🔴 Missing | All REST endpoints (`/api/v1/markets`, `/orders/place`, `/portfolio/balances`, etc.) |
| Redis Orderbook | 🔴 Missing | Redis connection, ZSET-based orderbook engine, Pub/Sub |
| TimescaleDB Candles | 🔴 Missing | Hypertable, continuous aggregations, chart data API |
| WebSocket Server | 🔴 Missing | Real-time push for orderbook + trades |
| Binance Data Feed | 🔴 Missing | WS mirror from Binance, historical candle seeder |
| Razorpay Integration | 🔴 Missing | Create-order, webhook, INR balance updates |
| Frontend Pages | 🔴 Missing | `/ticker`, `/spot/[market]`, `/portfolio`, `/profile/history`, `/add-balance` |
| UI/UX | 🔴 Basic | Current pages use raw inline styles, no design system |

---

## User Review Required

> [!IMPORTANT]
> **This is a massive project.** Building everything at once would be overwhelming. I propose a **phased approach** — each phase delivers a usable, testable increment. Please confirm which phase(s) you want me to start with, or if you'd like to adjust priorities.

> [!WARNING]
> **Infrastructure dependencies:** Phases 3+ require a running Redis instance and TimescaleDB extension. Do you already have these set up, or should the plan include Docker Compose configuration for local development?

## Open Questions

1. **Redis setup** — Do you have a Redis instance running locally or a cloud Redis URL? Or should I add a `docker-compose.yml` for Redis + TimescaleDB?
2. **Razorpay credentials** — Do you have sandbox/test API keys from Razorpay already?
3. **Session management** — Your login generates a JWT but doesn't store it (cookie/localStorage). Should I use HTTP-only cookies (more secure, recommended) or localStorage with Redux persistence?
4. **WebSocket server** — Next.js doesn't natively support WebSockets. Options:
   - **(A)** Separate Express/WS server running alongside Next.js (recommended for production)
   - **(B)** Use Server-Sent Events (SSE) from Next.js API routes (simpler, one process, but unidirectional)
   - Which do you prefer?
5. **Charting library** — Your spec says `lightweight-charts` by TradingView. Should I install and wire that up, or do you have a preference for a different charting lib?

---

## Proposed Changes — Phased Roadmap

### Phase 1: Design System & Core UI Shell
*Goal: Transform the app from raw inline styles to a premium dark-themed trading UI with navigation.*

#### [MODIFY] [globals.css](file:///f:/Projects/TradingPlatform/nextjs-prisma/app/globals.css)
- Complete design system: dark theme tokens, typography (Inter/Outfit from Google Fonts), gradients, glassmorphism utilities, animation keyframes.

#### [MODIFY] [layout.tsx](file:///f:/Projects/TradingPlatform/nextjs-prisma/app/layout.tsx)
- Re-enable globals.css import. Add a responsive sidebar/navbar component with links to all routes. Update metadata.

#### [NEW] `app/components/Navbar.tsx`
- Premium top navigation bar with logo, route links (Ticker, Spot, Portfolio, Profile), and auth status indicator.

#### [MODIFY] [page.tsx](file:///f:/Projects/TradingPlatform/nextjs-prisma/app/page.tsx)
- Replace the raw user dump with a proper landing/home page that redirects to `/ticker`.

#### [MODIFY] [login/page.tsx](file:///f:/Projects/TradingPlatform/nextjs-prisma/app/login/page.tsx) & [signup/page.tsx](file:///f:/Projects/TradingPlatform/nextjs-prisma/app/signup/page.tsx)
- Redesign with the new dark theme, proper form styling, transitions, and loading states.

#### [MODIFY] [profile/page.tsx](file:///f:/Projects/TradingPlatform/nextjs-prisma/app/profile/page.tsx)
- Redesign with card-based layout, avatar placeholder, and user details.

---

### Phase 2: Database Schema Expansion & Auth Hardening
*Goal: Complete the Prisma schema for all platform entities and secure auth via HTTP-only cookies.*

#### [MODIFY] [schema.prisma](file:///f:/Projects/TradingPlatform/nextjs-prisma/prisma/schema.prisma)
- Add `Wallet` model (userId, assetSymbol, availableBalance, lockedBalance)
- Add `Transaction` model (for Razorpay deposit/withdrawal tracking)
- Add proper relations: `User` → `Order[]`, `User` → `Wallet[]`, `Order` → `fills[]`
- Rename `fills` → `Fill`, `stocks` → `Stock` (Prisma convention: PascalCase model names)
- Add indexes on frequently queried columns

#### [NEW] `lib/auth.ts`
- JWT verification middleware utility
- Cookie-based session helpers (set/get/clear HTTP-only cookies)
- `getAuthUser(request)` helper for protected API routes

#### [MODIFY] [login/route.ts](file:///f:/Projects/TradingPlatform/nextjs-prisma/app/api/auth/login/route.ts)
- Set JWT into an HTTP-only cookie on successful login instead of just logging it
- Return token to client for Redux state hydration

#### [NEW] `app/api/auth/me/route.ts`
- `GET` endpoint to verify current session and return user data (for page refreshes)

---

### Phase 3: Market Data & Ticker Page
*Goal: Seed the database with trading pairs, build the `/ticker` page, and start pulling Binance data.*

#### [NEW] `prisma/seed-stocks.ts`
- Seed script to populate `Stock` table with trading pairs (BTC_INR, ETH_INR, SOL_INR, etc.)

#### [NEW] `lib/binance.ts`
- Utility to fetch historical klines from Binance public API
- Type definitions for Binance API responses

#### [NEW] `app/api/v1/markets/route.ts`
- `GET /api/v1/markets` — Returns all active trading pairs with 24h stats

#### [NEW] `app/ticker/page.tsx`
- Market overview grid: ticker cards with symbol, price, 24h change %, volume
- Real-time price color animations (green for up, red for down)
- "Trade" buttons linking to `/spot/[market]`

---

### Phase 4: Redis Orderbook & Order Execution
*Goal: Wire up Redis for the in-memory orderbook engine and build order placement.*

#### [NEW] `lib/redis.ts`
- Redis client singleton (using `ioredis`)

#### [NEW] `lib/orderbook.ts`
- Orderbook engine: `addBid()`, `addAsk()`, `getDepth()`, `matchOrders()`
- ZSET operations for bids (descending) and asks (ascending)

#### [NEW] `app/api/v1/orders/place/route.ts`
- `POST /api/v1/orders/place` — Authenticated endpoint
- Validates balance, locks funds, writes order to Prisma, adds to Redis ZSET
- Triggers matching engine

#### [NEW] `app/api/v1/orders/history/route.ts`
- `GET /api/v1/orders/history` — Returns user's order history from Prisma

#### [NEW] `app/api/v1/orderbook/route.ts`
- `GET /api/v1/orderbook?symbol=BTC_INR` — Returns top 50 depth levels from Redis

---

### Phase 5: Trading UI (`/spot/[market]`)
*Goal: Build the core trading interface with live orderbook, charts, and order execution.*

#### [NEW] `app/spot/[market]/page.tsx`
- Three-panel layout:
  - **Left:** Live orderbook (bids green, asks red, animated depth bars)
  - **Center:** TradingView Lightweight Charts canvas
  - **Right:** Order form (Limit/Market tabs, price/quantity inputs, allocation slider)

#### [NEW] `app/components/Orderbook.tsx`
- Real-time orderbook widget pulling from `/api/v1/orderbook` with polling or SSE

#### [NEW] `app/components/Chart.tsx`
- Wrapper around `lightweight-charts` rendering OHLCV candles

#### [NEW] `app/components/OrderForm.tsx`
- Tabbed Limit/Market order form with balance display and percentage sliders

#### [NEW] `app/api/v1/charts/route.ts`
- `GET /api/v1/charts?symbol=&resolution=&from=&to=` — OHLCV data endpoint

---

### Phase 6: Portfolio, Payments & History
*Goal: Complete the remaining pages and Razorpay integration.*

#### [NEW] `app/portfolio/page.tsx`
- Net worth summary cards, donut chart (asset distribution), PnL metrics

#### [NEW] `app/profile/history/page.tsx`
- Tabbed view: Orders, Deposits, Withdrawals with status badges

#### [NEW] `app/add-balance/page.tsx`
- INR deposit form with Razorpay Checkout integration

#### [NEW] `app/api/v1/payments/razorpay/create-order/route.ts`
- Server-side Razorpay order creation

#### [NEW] `app/api/v1/payments/razorpay/webhook/route.ts`
- Webhook receiver with cryptographic signature validation
- Updates user INR balance in Prisma on successful payment

#### [NEW] `app/api/v1/portfolio/balances/route.ts`
- `GET /api/v1/portfolio/balances` — User's wallet balances from Prisma

---

## New Dependencies Required

| Package | Purpose | Phase |
|---|---|---|
| `lightweight-charts` | TradingView charting | 5 |
| `ioredis` | Redis client for orderbook | 4 |
| `razorpay` | Payment SDK | 6 |
| `@types/bcrypt` | Type defs (if not already present) | 1 |
| `cookie` + `@types/cookie` | HTTP cookie parsing | 2 |

---

## Verification Plan

### Automated Tests
- `npx tsc --noEmit` — TypeScript type checking after each phase
- `npm run build` — Production build verification
- Manual API testing via browser dev tools / curl for each endpoint

### Manual Verification
- **Phase 1:** Visual inspection of UI in browser at `localhost:3000`
- **Phase 2:** Test login → cookie set → refresh → session persists
- **Phase 3:** `/ticker` page loads with market data from seeded DB
- **Phase 4:** Place an order via API, verify it appears in Redis and Prisma
- **Phase 5:** `/spot/BTC_INR` renders chart + orderbook + order form
- **Phase 6:** Complete Razorpay sandbox checkout → balance updates
