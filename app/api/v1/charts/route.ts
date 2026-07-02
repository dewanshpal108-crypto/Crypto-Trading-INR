// app/api/v1/charts/route.ts
// GET /api/v1/charts?symbol=BTC_INR&resolution=1h&from=1700000000&to=1700100000
//
// Bridges the platform's internal market symbols (BTC_INR) to Binance's public
// Klines API (BTCUSDT) and returns OHLCV data shaped for TradingView lightweight-charts.

import { NextRequest, NextResponse } from "next/server";
import { fetchHistoricalKlines, KlineInterval } from "@/lib/binance";

// ─── Symbol / Resolution Mappings ────────────────────────────────────────────

/**
 * Maps our internal INR market symbols → the closest Binance USDT pair.
 * Binance does not offer INR pairs, so we proxy USDT prices as a reference.
 */
const SYMBOL_TO_BINANCE: Record<string, string> = {
  BTC_INR: "BTCUSDT",
  ETH_INR: "ETHUSDT",
  SOL_INR: "SOLUSDT",
  XRP_INR: "XRPUSDT",
  ADA_INR: "ADAUSDT",
};

/**
 * Maps the `resolution` query param (TradingView-style) to Binance kline intervals.
 *
 * Supported resolutions:
 *   1, 5, 15, 30  → minute intervals
 *   60, 240       → hour intervals
 *   D             → 1 day
 */
const RESOLUTION_TO_INTERVAL: Record<string, KlineInterval> = {
  "1": "1m",
  "5": "5m",
  "15": "1m",  // proxied – Binance doesn't expose 15m in KlineInterval type; extend if needed
  "30": "5m",  // proxied
  "60": "1h",
  "240": "1h", // proxied
  "D": "1d",
  "1d": "1d",
  "1h": "1h",
  "5m": "5m",
  "1m": "1m",
};

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // ── 1. Parse & validate query params ──────────────────────────────────────
    const symbolParam = searchParams.get("symbol")?.toUpperCase();
    const resolutionParam = searchParams.get("resolution") ?? "1h";
    const fromParam = searchParams.get("from");   // Unix epoch seconds
    const toParam = searchParams.get("to");       // Unix epoch seconds
    const limitParam = searchParams.get("limit"); // Optional override

    if (!symbolParam) {
      return NextResponse.json(
        { error: "Missing required query parameter: symbol (e.g., BTC_INR)" },
        { status: 400 }
      );
    }

    // ── 2. Resolve Binance symbol ──────────────────────────────────────────────
    const binanceSymbol = SYMBOL_TO_BINANCE[symbolParam];
    if (!binanceSymbol) {
      return NextResponse.json(
        {
          error: `Unsupported symbol: ${symbolParam}. Supported: ${Object.keys(SYMBOL_TO_BINANCE).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // ── 3. Resolve Binance interval ────────────────────────────────────────────
    const interval = RESOLUTION_TO_INTERVAL[resolutionParam] ?? "1h";

    // ── 4. Build time-range params ─────────────────────────────────────────────
    // Binance API expects milliseconds; our API accepts Unix epoch seconds
    const startTime = fromParam ? parseInt(fromParam, 10) * 1000 : undefined;
    const endTime = toParam ? parseInt(toParam, 10) * 1000 : undefined;

    // Derive limit: if explicit range is given use 1000 (Binance max), else 500 default
    const limit = limitParam
      ? Math.min(parseInt(limitParam, 10), 1000)
      : startTime
      ? 1000
      : 500;

    // ── 5. Fetch from Binance ──────────────────────────────────────────────────
    const candles = await fetchHistoricalKlines({
      symbol: binanceSymbol,
      interval,
      limit,
      startTime,
      endTime,
    });

    // ── 6. Shape for lightweight-charts ───────────────────────────────────────
    // lightweight-charts candlestick series expects:
    //   { time: number (Unix seconds), open, high, low, close }
    // Volume series expects:
    //   { time: number (Unix seconds), value: number }
    const ohlcv = candles.map((c) => ({
      time: Math.floor(c.openTime.getTime() / 1000), // ms → seconds
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    return NextResponse.json(
      {
        message: "OHLCV chart data fetched successfully",
        symbol: symbolParam,
        binanceSymbol,
        interval,
        count: ohlcv.length,
        data: ohlcv,
      },
      { status: 200 }
    );
  } catch (error: any) {
    // Surface Binance API errors with a clear message
    const isBinanceError = error.message?.startsWith("Binance API Error");
    console.error("[Charts API] Error:", error.message);

    return NextResponse.json(
      {
        error: isBinanceError
          ? `Upstream data error: ${error.message}`
          : "Internal Server Error — failed to fetch chart data",
      },
      { status: isBinanceError ? 502 : 500 }
    );
  }
}
