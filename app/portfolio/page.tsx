// app/portfolio/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface WalletBalance {
  asset: string;
  available: number;
  locked: number;
  total: number;
  updatedAt: string;
}

interface PortfolioSummary {
  totalAssets: number;
  totalINR: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetches the latest close price (in USDT proxy) for a given asset
 * by calling our own /api/v1/charts endpoint with limit=1.
 * Returns 0 if the asset is unsupported or the fetch fails.
 */
async function fetchLivePrice(asset: string): Promise<number> {
  if (asset === "INR") return 1;
  try {
    const res = await fetch(
      `/api/v1/charts?symbol=${asset}_INR&resolution=1d&limit=1`
    );
    if (!res.ok) return 0;
    const json = await res.json();
    const candles: { close: number }[] = json.data ?? [];
    return candles.length > 0 ? candles[candles.length - 1].close : 0;
  } catch {
    return 0;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Fetch wallet balances
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await fetch("/api/v1/portfolio/balances");
        if (res.status === 401) {
          setError("Please log in to view your portfolio.");
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch balances");
        const json = await res.json();
        setBalances(json.balances ?? []);
        setSummary(json.summary ?? null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  // Step 2: Once balances arrive, fetch a live price for every unique asset in parallel
  useEffect(() => {
    if (loading || balances.length === 0) {
      setPricesLoading(false);
      return;
    }

    const fetchPrices = async () => {
      setPricesLoading(true);
      const uniqueAssets = [...new Set(balances.map((b) => b.asset))];
      const results = await Promise.all(
        uniqueAssets.map(async (asset) => ({
          asset,
          price: await fetchLivePrice(asset),
        }))
      );
      const priceMap: Record<string, number> = {};
      for (const { asset, price } of results) {
        priceMap[asset] = price;
      }
      setPrices(priceMap);
      setPricesLoading(false);
    };

    fetchPrices();
  }, [balances, loading]);

  // Compute net worth using live prices (falls back to 0 while loading)
  const netWorthINR = balances.reduce((sum, b) => {
    const price = prices[b.asset] ?? 0;
    return sum + b.total * price;
  }, 0);

  const cryptoBalances = balances.filter((b) => b.asset !== "INR");

  // ── Loading / Error states ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center text-red-400">
        <div className="text-center space-y-4">
          <p className="text-lg">{error}</p>
          <Link href="/login" className="text-yellow-500 underline text-sm">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-gray-200 py-10 px-4 max-w-5xl mx-auto">
      {/* ── Page Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Portfolio</h1>
        <p className="text-gray-500 text-sm mt-1">Your asset balances and live net worth.</p>
      </div>

      {/* ── Net Worth Card ── */}
      <div className="bg-gradient-to-r from-yellow-900/30 to-yellow-500/10 border border-yellow-800/50 rounded-xl p-6 mb-8">
        <p className="text-xs text-yellow-600 uppercase font-mono tracking-widest mb-1">
          Estimated Net Worth
        </p>
        {pricesLoading ? (
          <p className="text-2xl font-black font-mono text-yellow-400/40 animate-pulse">
            Fetching live prices…
          </p>
        ) : (
          <p className="text-4xl font-black font-mono text-yellow-400">
            ₹{netWorthINR.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Prices sourced from Binance via{" "}
          <span className="font-mono text-gray-400">/api/v1/charts</span>.
          INR balance is exact.
        </p>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Total Assets" value={String(summary?.totalAssets ?? 0)} />
        <SummaryCard
          label="INR Balance"
          value={`₹${(summary?.totalINR ?? 0).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          })}`}
        />
        <SummaryCard label="Crypto Positions" value={String(cryptoBalances.length)} />
      </div>

      {/* ── Add Balance CTA ── */}
      <div className="flex justify-end mb-6">
        <Link
          href="/add-balance"
          className="px-5 py-2 bg-yellow-500 text-black font-bold text-sm rounded hover:bg-yellow-400 transition-colors"
        >
          + Add INR Balance
        </Link>
      </div>

      {/* ── Balances Table ── */}
      {balances.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">No balances yet.</p>
          <p className="text-sm mt-2">
            <Link href="/add-balance" className="text-yellow-500 underline">
              Add INR
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="bg-[#161a1e] rounded-xl overflow-hidden border border-gray-800">
          {/* Table header */}
          <div className="grid grid-cols-4 text-[11px] text-gray-500 uppercase font-mono tracking-widest px-4 py-3 border-b border-gray-800">
            <span>Asset</span>
            <span className="text-right">Available</span>
            <span className="text-right">Locked</span>
            <span className="text-right">Total</span>
          </div>

          {balances.map((b) => {
            const priceINR = prices[b.asset] ?? 0;
            const valueINR = b.total * priceINR;
            return (
              <div
                key={b.asset}
                className="grid grid-cols-4 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
              >
                {/* Asset name + live INR value */}
                <div>
                  <p className="font-bold text-white text-sm">{b.asset}</p>
                  {b.asset !== "INR" && (
                    <p className="text-[11px] text-gray-500 font-mono">
                      {pricesLoading ? (
                        <span className="animate-pulse text-gray-700">loading…</span>
                      ) : priceINR > 0 ? (
                        <>≈ ₹{valueINR.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</>
                      ) : (
                        <span className="text-gray-700">price unavailable</span>
                      )}
                    </p>
                  )}
                </div>
                <p className="text-right font-mono text-sm text-green-400">
                  {b.available.toFixed(b.asset === "INR" ? 2 : 6)}
                </p>
                <p className="text-right font-mono text-sm text-yellow-400">
                  {b.locked.toFixed(b.asset === "INR" ? 2 : 6)}
                </p>
                <p className="text-right font-mono text-sm text-white font-semibold">
                  {b.total.toFixed(b.asset === "INR" ? 2 : 6)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Navigation Links ── */}
      <div className="flex gap-4 mt-8 text-sm text-gray-500">
        <Link href="/profile/history" className="hover:text-yellow-400 transition-colors">
          Order History →
        </Link>
        <Link href="/ticker" className="hover:text-yellow-400 transition-colors">
          Markets →
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-component ─────────────────────────────────────────────────────────────

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#161a1e] border border-gray-800 rounded-xl p-4">
      <p className="text-[10px] text-gray-500 uppercase font-mono tracking-widest mb-1">{label}</p>
      <p className="text-xl font-bold font-mono text-white">{value}</p>
    </div>
  );
}
