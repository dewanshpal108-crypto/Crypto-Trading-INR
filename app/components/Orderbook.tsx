// app/components/Orderbook.tsx
"use client";

import React, { useState, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OrderLevel {
  price: number;
  quantity: number;
  orderId: string;
}

interface OrderbookData {
  bids: OrderLevel[];
  asks: OrderLevel[];
}

interface OrderbookProps {
  /** Uppercase market symbol, e.g. "BTC_INR" */
  symbol: string;
  /**
   * Optional callback: fires whenever the user clicks an ask/bid row so the
   * parent (or sibling OrderForm) can auto-fill the price input.
   */
  onPriceClick?: (price: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Orderbook({ symbol, onPriceClick }: OrderbookProps) {
  const [baseAsset, quoteAsset] = symbol.split("_");
  const [orderbook, setOrderbook] = useState<OrderbookData>({ bids: [], asks: [] });

  // Poll orderbook every second (fallback until WebSocket is wired)
  useEffect(() => {
    const fetchOrderbook = async () => {
      try {
        const res = await fetch(`/api/v1/orderbook?symbol=${symbol}`);
        if (res.ok) {
          const json = await res.json();
          setOrderbook({
            bids: json.marketData?.bids ?? [],
            asks: json.marketData?.asks ?? [],
          });
        }
      } catch (err) {
        console.error("[Orderbook] Fetch failed:", err);
      }
    };

    fetchOrderbook();
    const interval = setInterval(fetchOrderbook, 1000);
    return () => clearInterval(interval);
  }, [symbol]);

  const getMaxVolume = (levels: OrderLevel[]) =>
    Math.max(...levels.map((l) => l.quantity), 1);

  return (
    <div className="bg-[#161a1e] rounded p-3 flex flex-col h-[650px] overflow-hidden">
      <h2 className="text-sm font-semibold mb-2 border-b border-gray-700 pb-1">
        Order Book ({symbol})
      </h2>

      {/* ── Asks (Sells) — reversed so highest ask is at top visually ── */}
      <div className="flex-1 flex flex-col justify-end overflow-y-auto mb-2">
        {/* Column header */}
        <div className="grid grid-cols-3 text-xs text-gray-400 mb-1 font-mono sticky top-0 bg-[#161a1e]">
          <span>Price ({quoteAsset})</span>
          <span className="text-right">Size ({baseAsset})</span>
          <span className="text-right">Total</span>
        </div>

        {[...orderbook.asks].reverse().slice(-15).map((ask, idx) => {
          const pct = (ask.quantity / getMaxVolume(orderbook.asks)) * 100;
          return (
            <div
              key={ask.orderId || idx}
              className="grid grid-cols-3 text-xs py-0.5 font-mono relative cursor-pointer hover:bg-gray-800"
              onClick={() => onPriceClick?.(ask.price)}
            >
              {/* Depth bar */}
              <div
                className="absolute right-0 top-0 bottom-0 bg-red-900/20 pointer-events-none transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
              <span className="text-red-500 z-10">{ask.price.toLocaleString()}</span>
              <span className="text-right z-10">{ask.quantity.toFixed(4)}</span>
              <span className="text-right text-gray-400 z-10">
                {(ask.price * ask.quantity).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Spread ── */}
      <div className="bg-[#1e2329] px-2 py-1 my-1 text-center font-bold text-sm border-y border-gray-800">
        Spread:{" "}
        {orderbook.asks[0] && orderbook.bids[0]
          ? (orderbook.asks[0].price - orderbook.bids[0].price).toLocaleString()
          : "0"}
      </div>

      {/* ── Bids (Buys) ── */}
      <div className="flex-1 overflow-y-auto">
        {orderbook.bids.slice(0, 15).map((bid, idx) => {
          const pct = (bid.quantity / getMaxVolume(orderbook.bids)) * 100;
          return (
            <div
              key={bid.orderId || idx}
              className="grid grid-cols-3 text-xs py-0.5 font-mono relative cursor-pointer hover:bg-gray-800"
              onClick={() => onPriceClick?.(bid.price)}
            >
              <div
                className="absolute right-0 top-0 bottom-0 bg-green-900/20 pointer-events-none transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
              <span className="text-green-500 z-10">{bid.price.toLocaleString()}</span>
              <span className="text-right z-10">{bid.quantity.toFixed(4)}</span>
              <span className="text-right text-gray-400 z-10">
                {(bid.price * bid.quantity).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
