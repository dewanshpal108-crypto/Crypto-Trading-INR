// app/components/Chart.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
// ─── Types ─────────────────────────────────────────────────────────────────────
interface OHLCVCandle {
  time: number; // Unix seconds — what lightweight-charts expects
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
type Resolution = "1m" | "5m" | "1h" | "1d" | "D";
interface ChartProps {
  /** Uppercase market symbol, e.g. "BTC_INR" */
  symbol: string;
  /** Candlestick interval forwarded to /api/v1/charts. Defaults to "1h". */
  resolution?: Resolution;
}
const RESOLUTIONS: { label: string; value: Resolution }[] = [
  { label: "1m", value: "1m" },
  { label: "5m", value: "5m" },
  { label: "1H", value: "1h" },
  { label: "1D", value: "1d" },
];
const SYMBOL_TO_BINANCE: Record<string, string> = {
  BTC_INR: "BTCUSDT",
  ETH_INR: "ETHUSDT",
  SOL_INR: "SOLUSDT",
  XRP_INR: "XRPUSDT",
  ADA_INR: "ADAUSDT",
};
const RESOLUTION_TO_INTERVAL: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "1h": "1h",
  "1d": "1d",
};
function timeToLocal(originalTime: number): number {
  const d = new Date(originalTime * 1000);
  return Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds(),
    d.getMilliseconds()
  ) / 1000;
}
// ─── Component ────────────────────────────────────────────────────────────────
export default function Chart({ symbol, resolution: initialResolution = "1h" }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [resolution, setResolution] = useState<Resolution>(initialResolution);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    let chart: any;
    let resizeObserver: ResizeObserver;
    let ws: WebSocket | null = null;
    setLoading(true);
    setError(null);
    // Dynamic import prevents SSR crash — lightweight-charts uses browser APIs
    import("lightweight-charts").then(async ({ createChart, CandlestickSeries }) => {
      if (!containerRef.current) return;
      chart = createChart(containerRef.current, {
        layout: {
          background: { color: "#131722" },
          textColor: "#d1d4dc",
        },
        grid: {
          vertLines: { color: "#1f222e" },
          horzLines: { color: "#1f222e" },
        },
        crosshair: {
          mode: 1, // CrosshairMode.Normal
        },
        rightPriceScale: {
          borderColor: "#2a2d36",
        },
        timeScale: {
          borderColor: "#2a2d36",
          timeVisible: true,
          secondsVisible: false,
        },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 420,
      });
      // v5 API: addSeries(SeriesType, options) replaces addCandlestickSeries()
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
      });
      // ── Fetch OHLCV from our Binance proxy API ──────────────────────────────
      try {
        const res = await fetch(
          `/api/v1/charts?symbol=${symbol}&resolution=${resolution}&limit=200`
        );
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        const json = await res.json();
        const rawCandles: OHLCVCandle[] = json.data ?? [];
        const candles = rawCandles.map((c) => ({
          ...c,
          time: timeToLocal(c.time),
        }));
        if (candles.length > 0) {
          candlestickSeries.setData(candles);
          chart.timeScale().fitContent();
          setLastPrice(candles[candles.length - 1].close);
        }
        // ── Binance WebSocket Connection for Real-Time Updates ──────────────
        const binanceSymbol = SYMBOL_TO_BINANCE[symbol]?.toLowerCase();
        const binanceResolution = RESOLUTION_TO_INTERVAL[resolution] ?? resolution;
        if (binanceSymbol) {
          const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSymbol}@kline_${binanceResolution}`;
          ws = new WebSocket(wsUrl);
          ws.onopen = () => {
            console.log(`[Chart WS] Connected to ${wsUrl}`);
          };
          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              if (message.e === "kline") {
                const k = message.k;
                const candleUpdate: OHLCVCandle = {
                  time: timeToLocal(Math.floor(k.t / 1000)),
                  open: parseFloat(k.o),
                  high: parseFloat(k.h),
                  low: parseFloat(k.l),
                  close: parseFloat(k.c),
                  volume: parseFloat(k.v),
                };
                candlestickSeries.update(candleUpdate);
                setLastPrice(candleUpdate.close);
              }
            } catch (err) {
              console.error("[Chart WS] message parse error:", err);
            }
          };
          ws.onerror = (err) => {
            console.error("[Chart WS] error:", err);
          };
          ws.onclose = () => {
            console.log("[Chart WS] connection closed");
          };
        }
      } catch (err: any) {
        console.error("[Chart] OHLCV fetch failed:", err);
        setError("Could not load chart data.");
      } finally {
        setLoading(false);
      }
      // ── Responsive resize ───────────────────────────────────────────────────
      resizeObserver = new ResizeObserver((entries) => {
        if (entries[0] && chart) {
          chart.applyOptions({
            width: entries[0].contentRect.width,
            height: entries[0].contentRect.height || 420,
          });
        }
      });
      resizeObserver.observe(containerRef.current);
    });
    return () => {
      resizeObserver?.disconnect();
      if (chart) chart.remove();
      if (ws) {
        ws.close();
      }
    };
  }, [symbol, resolution]); // Re-render chart when market or resolution changes
  return (
    <div className="bg-[#161a1e] rounded p-3 flex flex-col h-[650px]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-gray-700 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold">{symbol} Spot Chart</span>
          {lastPrice !== null && (
            <span className="text-sm font-mono text-yellow-400">
              ≈ $
              {lastPrice.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          )}
          {loading && (
            <span className="text-xs text-gray-500 animate-pulse">Loading…</span>
          )}
          {error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
        {/* Resolution selector */}
        <div className="flex items-center gap-1">
          {RESOLUTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setResolution(r.value)}
              className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${resolution === r.value
                ? "bg-yellow-500 text-black font-bold"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
            >
              {r.label}
            </button>
          ))}
          <span className="ml-2 text-xs font-mono text-green-400 bg-green-950/40 px-2 py-0.5 rounded">
            Live
          </span>
        </div>
      </div>
      {/* ── Chart canvas ── */}
      <div
        ref={containerRef}
        className="w-full flex-1 rounded overflow-hidden bg-[#131722]"
      />
    </div>
  );
}
