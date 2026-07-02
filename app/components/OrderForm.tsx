// app/components/OrderForm.tsx
"use client";

import React, { useState, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OrderFormProps {
  /** Uppercase market symbol, e.g. "BTC_INR" */
  symbol: string;
  /**
   * Optional: pre-fill the price input when the user clicks a row in the
   * Orderbook. Parent can pass the clicked price down here.
   */
  selectedPrice?: number | null;
}

// Define these locally for the frontend to prevent importing Prisma into the browser
enum Side {
  BUY = "BUY",
  SELL = "SELL"
}

enum Type {
  LIMIT = "LIMIT",
  MARKET = "MARKET"
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderForm({ symbol, selectedPrice }: OrderFormProps) {
  const [baseAsset, quoteAsset] = symbol.split("_"); // "BTC", "INR"

  // ── Form State ──────────────────────────────────────────────────────────────
  const [side, setSide] = useState<Side>(Side.BUY);
  const [orderType, setOrderType] = useState<Type>(Type.LIMIT);
  const [price, setPrice] = useState<string>(
    selectedPrice != null ? String(selectedPrice) : ""
  );
  const [quantity, setQuantity] = useState<string>("");
  const [percentage, setPercentage] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  // Real wallet balances fetched from the portfolio API
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [balancesLoading, setBalancesLoading] = useState(true);

  useEffect(() => {
    const fetchBalances = async () => {
      setBalancesLoading(true);
      try {
        const res = await fetch("/api/v1/portfolio/balances");
        if (res.ok) {
          const json = await res.json();
          // Convert array → { BTC: 0.524, INR: 250000, ... }
          const map: Record<string, number> = {};
          for (const b of json.balances ?? []) {
            map[b.asset] = b.available; // use *available* (unlocked) balance
          }
          setBalances(map);
        }
      } catch (err) {
        console.error("[OrderForm] Failed to fetch balances:", err);
      } finally {
        setBalancesLoading(false);
      }
    };
    fetchBalances();
  }, [symbol]); // re-fetch when market changes

  // Sync price input when parent passes a clicked orderbook price
  React.useEffect(() => {
    if (selectedPrice != null) {
      setPrice(String(selectedPrice));
    }
  }, [selectedPrice]);

  // ── Allocation slider ────────────────────────────────────────────────────────
  const handlePercentageChange = (pct: number) => {
    setPercentage(pct);
    if (side === Side.BUY) {
      const available = balances[quoteAsset] ?? 0;
      const currentPrice = parseFloat(price) || 0;
      if (currentPrice > 0) {
        setQuantity(((available * (pct / 100)) / currentPrice).toFixed(4));
      }
    } else {
      const available = balances[baseAsset] ?? 0;
      setQuantity((available * (pct / 100)).toFixed(4));
    }
  };

  // ── Order submission ─────────────────────────────────────────────────────────
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const res = await fetch("/api/v1/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Auth is handled server-side via the HTTP-only JWT cookie
        body: JSON.stringify({
          symbol,
          side,
          type: orderType,
          price: parseFloat(price),
          quantity: parseFloat(quantity),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Order execution failed");

      setStatusMessage({
        text: `✓ Order placed! Status: ${data.matchResult?.status ?? "OPEN"}`,
        error: false,
      });
      setQuantity("");
      setPercentage(0);
    } catch (err: any) {
      setStatusMessage({ text: err.message, error: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived totals ───────────────────────────────────────────────────────────
  const estimatedTotal =
    orderType === Type.LIMIT
      ? (parseFloat(price) || 0) * (parseFloat(quantity) || 0)
      : null;

  return (
    <div className="bg-[#161a1e] rounded p-4 flex flex-col h-[650px] justify-between">
      <form onSubmit={handlePlaceOrder} className="space-y-4">

        {/* ── Buy / Sell Toggle ── */}
        <div className="grid grid-cols-2 gap-2 bg-[#0b0e11] p-1 rounded">
          <button
            type="button"
            onClick={() => { setSide(Side.BUY); setPercentage(0); }}
            className={`py-2 text-sm font-bold rounded transition-colors ${side === Side.BUY
                ? "bg-green-600 text-white"
                : "text-gray-400 hover:text-white"
              }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => { setSide(Side.SELL); setPercentage(0); }}
            className={`py-2 text-sm font-bold rounded transition-colors ${side === Side.SELL
                ? "bg-red-600 text-white"
                : "text-gray-400 hover:text-white"
              }`}
          >
            Sell
          </button>
        </div>

        {/* ── Limit / Market Tabs ── */}
        <div className="flex space-x-4 border-b border-gray-700 text-sm pb-1">
          {[Type.LIMIT, Type.MARKET].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOrderType(t)}
              className={`pb-1 ${orderType === t
                  ? "border-b-2 border-yellow-500 text-yellow-500 font-medium"
                  : "text-gray-400"
                }`}
            >
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* ── Available Balance ── */}
        <div className="flex justify-between text-xs text-gray-400 px-1">
          <span>Avbl</span>
          {balancesLoading ? (
            <span className="font-mono animate-pulse text-gray-600">Loading…</span>
          ) : (
            <span className="font-mono text-white">
              {side === Side.BUY
                ? `${(balances[quoteAsset] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${quoteAsset}`
                : `${(balances[baseAsset] ?? 0).toFixed(6)} ${baseAsset}`}
            </span>
          )}
        </div>

        {/* ── Price Field ── */}
        {orderType === Type.LIMIT ? (
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Price ({quoteAsset})</label>
            <div className="bg-[#2b3139] rounded p-2 flex items-center">
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-transparent w-full outline-none font-mono text-sm text-white"
                placeholder="0.00"
                required
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs text-gray-400">Price ({quoteAsset})</label>
            <div className="bg-[#1e2329] text-gray-500 rounded p-2 text-sm font-mono select-none">
              Market Price — Best Available
            </div>
          </div>
        )}

        {/* ── Quantity Field ── */}
        <div className="space-y-1">
          <label className="text-xs text-gray-400">Amount ({baseAsset})</label>
          <div className="bg-[#2b3139] rounded p-2 flex items-center">
            <input
              type="number"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-transparent w-full outline-none font-mono text-sm text-white"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* ── Allocation % Buttons ── */}
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentageChange(pct)}
              className={`text-[10px] py-1 font-mono rounded border border-gray-700 transition-colors ${percentage === pct
                  ? "bg-yellow-500 text-black border-yellow-500 font-bold"
                  : "bg-transparent text-gray-400 hover:bg-gray-800"
                }`}
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* ── Estimated Total ── */}
        {estimatedTotal !== null && estimatedTotal > 0 && (
          <div className="flex justify-between text-xs text-gray-400 px-1">
            <span>Est. Total</span>
            <span className="font-mono">
              {estimatedTotal.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}{" "}
              {quoteAsset}
            </span>
          </div>
        )}

        {/* ── Submit Button ── */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded text-sm font-bold text-black transition-opacity ${side === Side.BUY
              ? "bg-green-400 hover:opacity-90"
              : "bg-red-400 hover:opacity-90"
            } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {isSubmitting
            ? "Routing to Engine…"
            : `${side === Side.BUY ? "Buy" : "Sell"} ${baseAsset}`}
        </button>
      </form>

      {/* ── Status Message ── */}
      {statusMessage && (
        <div
          className={`p-3 rounded text-xs mt-2 ${statusMessage.error
              ? "bg-red-950/50 border border-red-900 text-red-400"
              : "bg-green-950/50 border border-green-900 text-green-400"
            }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
