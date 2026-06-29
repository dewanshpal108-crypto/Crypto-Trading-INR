// lib/orderbook.ts

import { Side, Type, Status } from "../app/generated/prisma/client";
import prisma from "./prisma";
import redis, {
  type Side as RedisSide,
  zAddLevel,
  zRemoveLevel,
  getTopBids,
  getTopAsks,
  publishTrade,
  publishDepth,
} from "./redis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderLevel {
  price: number;
  quantity: number;
  orderId: string;
}

export interface DepthSnapshot {
  symbol: string;
  bids: OrderLevel[]; // sorted descending (highest price first)
  asks: OrderLevel[]; // sorted ascending  (lowest  price first)
  timestamp: number;
}

export interface PlaceOrderInput {
  userId: string;
  stockId: string;   // Prisma FK (UUID of the Stock row)
  symbol: string;    // e.g. "BTC_INR" — used as Redis key prefix
  side: Side;        // Side.BUY | Side.SELL
  type: Type;        // Type.LIMIT | Type.MARKET
  price: number;
  quantity: number;
}

interface FillRecord {
  price: number;
  quantity: number;
  buyOrderId: string;
  sellOrderId: string;
}

export interface MatchResult {
  filledQuantity: number;
  fills: FillRecord[];
  remainingQuantity: number;
  status: Status; // OPEN | FILLED | CANCELLED (on Partialy_filed record it will be Open)
}

// ─── Helpers: bid ↔ ask mapping ───────────────────────────────────────────────

const toRedisSide = (side: Side): RedisSide =>
  side === Side.BUY ? "bid" : "ask";

const opposingRedisSide = (side: Side): RedisSide =>
  side === Side.BUY ? "ask" : "bid";

// ─── Orderbook ZSET Operations ────────────────────────────────────────────────

/**
 * Add a BUY order to the bids ZSET.
 * Score = price so ZREVRANGE gives highest bids first.
 */
export async function addBid(
  symbol: string,
  price: number,
  quantity: number,
  orderId: string
): Promise<void> {
  await zAddLevel(symbol, "bid", price, quantity, orderId);
}

/**
 * Add a SELL order to the asks ZSET.
 * Score = price so ZRANGE gives lowest asks first.
 */
export async function addAsk(
  symbol: string,
  price: number,
  quantity: number,
  orderId: string
): Promise<void> {
  await zAddLevel(symbol, "ask", price, quantity, orderId);
}

/** Remove an order from the ZSET for its side */
export async function removeOrder(
  symbol: string,
  side: Side,
  price: number,
  quantity: number,
  orderId: string
): Promise<void> {
  await zRemoveLevel(symbol, toRedisSide(side), price, quantity, orderId);
}

/**
 * Get the current depth snapshot (top N levels each side).
 * Bids → descending price, Asks → ascending price.
 */
export async function getDepth(
  symbol: string,
  limit = 50
): Promise<DepthSnapshot> {
  const [bids, asks] = await Promise.all([
    getTopBids(symbol, limit),
    getTopAsks(symbol, limit),
  ]);
  return {
    symbol: symbol.toUpperCase(),
    bids,
    asks,
    timestamp: Date.now(),
  };
}

// ─── Matching Engine ──────────────────────────────────────────────────────────

/**
 * Price-time priority matching engine.
 *
 * - BUY  taker → walks asks (ascending)  for price <= taker price
 * - SELL taker → walks bids (descending) for price >= taker price
 *
 * Each match:
 *   1. Removes/reduces maker level in Redis
 *   2. Persists a Fill row in Prisma (buyOrderId + sellOrderId)
 *   3. Updates maker Order.filledQty + status in Prisma
 *   4. Settles Wallet balances (locked → available)
 *   5. Publishes trade + depth events via Redis Pub/Sub
 */
export async function matchOrders(
  takerOrderId: string,
  input: PlaceOrderInput
): Promise<MatchResult> {
  const { symbol, stockId, side, type, price: takerPrice, quantity } = input;
  let remainingQty = quantity;
  const fills: FillRecord[] = [];

  // Fetch opposing levels from Redis
  const opposingLevels: OrderLevel[] =
    side === Side.BUY
      ? await getTopAsks(symbol, 100)  // buying  → match against asks (lowest first)
      : await getTopBids(symbol, 100); // selling → match against bids (highest first)

  for (const level of opposingLevels) {
    if (remainingQty <= 0) break;

    // Price-crossing check
    const priceMatches =
      type === Type.MARKET ||
      (side === Side.BUY  ? level.price <= takerPrice  // buy at or below best ask
                          : level.price >= takerPrice); // sell at or above best bid

    if (!priceMatches) break; // ZSET is sorted; no further match possible

    const fillQty   = Math.min(remainingQty, level.quantity);
    const fillPrice = level.price; // maker price wins (price-time priority)

    // ── 1. Remove maker level from Redis ──
    await zRemoveLevel(
      symbol,
      opposingRedisSide(side),
      level.price,
      level.quantity,
      level.orderId
    );

    // Partial fill of maker → re-add with reduced quantity
    if (level.quantity > fillQty) {
      await zAddLevel(
        symbol,
        opposingRedisSide(side),
        level.price,
        level.quantity - fillQty,
        level.orderId
      );
    }

    // ── 2. Persist Fill in Prisma ──
    // Schema: Fill { StockId, price, qty, buyOrderId, sellOrderId }
    await prisma.fill.create({
      data: {
        StockId:     stockId,
        price:       fillPrice,
        qty:         fillQty,
        buyOrderId:  side === Side.BUY  ? takerOrderId : level.orderId,
        sellOrderId: side === Side.SELL ? takerOrderId : level.orderId,
      },
    });

    // ── 3. Update maker Order status in Prisma ──
    const makerFullyFilled = level.quantity <= fillQty;
    await prisma.order.update({
      where: { id: level.orderId },
      data: {
        filledQty: { increment: fillQty },
        // Schema Status enum: OPEN | FILLED | CANCELLED (no PARTIALLY_FILLED)
        status: makerFullyFilled ? Status.FILLED : Status.OPEN,
      },
    });

    // ── 4. Settle wallet balances ──
    const buyerId  = side === Side.BUY  ? input.userId : await getOrderUserId(level.orderId);
    const sellerId = side === Side.SELL ? input.userId : await getOrderUserId(level.orderId);
    await settleBalances(symbol, buyerId, sellerId, fillPrice, fillQty);

    fills.push({
      price:       fillPrice,
      quantity:    fillQty,
      buyOrderId:  side === Side.BUY  ? takerOrderId : level.orderId,
      sellOrderId: side === Side.SELL ? takerOrderId : level.orderId,
    });

    remainingQty -= fillQty;
  }

  // ── Determine taker final status ──
  const filledQty = quantity - remainingQty;

  // Schema has no PARTIALLY_FILLED: treat partial as OPEN (still resting on book)
  const finalStatus: Status =
    remainingQty <= 0 ? Status.FILLED : Status.OPEN;

  // If limit order, keep remainder resting in the book
  if (remainingQty > 0 && type === Type.LIMIT) {
    await zAddLevel(symbol, toRedisSide(side), takerPrice, remainingQty, takerOrderId);
  }

  // ── Update taker Order in Prisma ──
  await prisma.order.update({
    where: { id: takerOrderId },
    data: { filledQty, status: finalStatus },
  });

  // ── 5. Publish real-time events ──
  if (fills.length > 0) {
    await publishTrade(symbol, {
      symbol,
      price:     fills[fills.length - 1].price,
      quantity:  filledQty,
      side:      side === Side.BUY ? "bid" : "ask",
      timestamp: Date.now(),
    });
  }

  const depth = await getDepth(symbol, 20);
  await publishDepth(symbol, depth);

  return {
    filledQuantity:    filledQty,
    fills,
    remainingQuantity: remainingQty,
    status:            finalStatus,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetch the userId of an existing order (used during matching to resolve maker) */
async function getOrderUserId(orderId: string): Promise<string> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { userId: true },
  });
  return order.userId;
}

/**
 * Settle wallet balances after a fill.
 *
 * BUY fill:
 *   - Buyer : locked INR  -= price * qty  |  base asset available += qty
 *   - Seller: locked base -= qty          |  INR available        += price * qty
 *
 * Schema Wallet fields: assetSymbol, availableBalance, lockedBalance
 * Unique key:           @@unique([userId, assetSymbol])
 */
async function settleBalances(
  symbol: string,
  buyerId: string,
  sellerId: string,
  price: number,
  qty: number
): Promise<void> {
  const [baseAsset] = symbol.split("_"); // "BTC" from "BTC_INR"
  const quoteAsset  = "INR";
  const quoteAmount = price * qty;

  await Promise.all([
    // Buyer: deduct locked INR
    prisma.wallet.updateMany({
      where: { userId: buyerId, assetSymbol: quoteAsset },
      data:  { lockedBalance: { decrement: quoteAmount } },
    }),
    // Buyer: credit base asset
    prisma.wallet.upsert({
      where:  { userId_assetSymbol: { userId: buyerId, assetSymbol: baseAsset } },
      update: { availableBalance: { increment: qty } },
      create: { userId: buyerId, assetSymbol: baseAsset, availableBalance: qty, lockedBalance: 0 },
    }),
    // Seller: deduct locked base asset
    prisma.wallet.updateMany({
      where: { userId: sellerId, assetSymbol: baseAsset },
      data:  { lockedBalance: { decrement: qty } },
    }),
    // Seller: credit INR
    prisma.wallet.upsert({
      where:  { userId_assetSymbol: { userId: sellerId, assetSymbol: quoteAsset } },
      update: { availableBalance: { increment: quoteAmount } },
      create: { userId: sellerId, assetSymbol: quoteAsset, availableBalance: quoteAmount, lockedBalance: 0 },
    }),
  ]);
}
