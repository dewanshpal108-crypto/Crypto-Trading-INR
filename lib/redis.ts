// lib/redis.ts

import Redis from "ioredis";
declare global {
  // Prevent multiple instances during Next.js hot-reloads in development
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

function createRedisClient(): Redis {
  const redisUrl = process.env.REDIS_URL;

  const client = redisUrl
    ? new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    })
    : new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

  client.on("connect", () => {
    console.log("[Redis] Connected");
  });

  client.on("error", (err: Error) => {
    console.error("[Redis] Error:", err.message);
  });

  client.on("reconnecting", () => {
    console.warn("[Redis] Reconnecting...");
  });

  return client;
}

// Singleton: reuse across hot-reloads in development, create fresh in production
const redis: Redis =
  process.env.NODE_ENV === "production"
    ? createRedisClient()
    : (global._redis ?? (global._redis = createRedisClient()));

export default redis;

// ─── Typed helpers used by the orderbook engine ──────────────────────────────

/** Orderbook side */
export type Side = "bid" | "ask";

/** Key convention:  orderbook:{symbol}:bids  or  orderbook:{symbol}:asks */
export const orderbookKey = (symbol: string, side: Side) =>
  `orderbook:${symbol.toUpperCase()}:${side}s`;

/**
 * Add / update a price level in the ZSET.
 * score  = price (bids are stored as-is; consumers reverse the sort with ZREVRANGE)
 * member = JSON string of { price, quantity, orderId }
 */
export async function zAddLevel(
  symbol: string,
  side: Side,
  price: number,
  quantity: number,
  orderId: string
): Promise<void> {
  const key = orderbookKey(symbol, side);
  const member = JSON.stringify({ price, quantity, orderId });
  await redis.zadd(key, price, member);
}

/** Remove a specific order from the ZSET by its member value */
export async function zRemoveLevel(
  symbol: string,
  side: Side,
  price: number,
  quantity: number,
  orderId: string
): Promise<void> {
  const key = orderbookKey(symbol, side);
  const member = JSON.stringify({ price, quantity, orderId });
  await redis.zrem(key, member);
}

/** Fetch top N levels for asks (ascending price) */
export async function getTopAsks(
  symbol: string,
  limit = 50
): Promise<{ price: number; quantity: number; orderId: string }[]> {
  const key = orderbookKey(symbol, "ask");
  const raw = await redis.zrange(key, 0, limit - 1); // lowest asks first
  return raw.map((m) => JSON.parse(m));
}

/** Fetch top N levels for bids (descending price) */
export async function getTopBids(
  symbol: string,
  limit = 50
): Promise<{ price: number; quantity: number; orderId: string }[]> {
  const key = orderbookKey(symbol, "bid");
  const raw = await redis.zrevrange(key, 0, limit - 1); // highest bids first
  return raw.map((m) => JSON.parse(m));
}

/** Pub/Sub: publish a trade event to a channel */
export async function publishTrade(
  symbol: string,
  payload: object
): Promise<void> {
  await redis.publish(`trades:${symbol.toUpperCase()}`, JSON.stringify(payload));
}

/** Pub/Sub: publish an orderbook-depth update */
export async function publishDepth(
  symbol: string,
  payload: object
): Promise<void> {
  await redis.publish(`depth:${symbol.toUpperCase()}`, JSON.stringify(payload));
}
