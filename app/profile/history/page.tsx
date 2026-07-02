// app/profile/history/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Order {
  id: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "MARKET";
  price: string;
  quantity: string;
  filledQty: string;
  status: "OPEN" | "FILLED" | "CANCELLED";
  createdAt: string;
  stock?: { symbol: string };
}

interface Transaction {
  id: string;
  amount: string;
  type: "DEPOSIT" | "WITHDRAW";
  status: "PENDING" | "SUCCESS" | "FAILED";
  providerReference: string;
  createdAt: string;
}

type Tab = "orders" | "deposits";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  OPEN: "bg-blue-900/40 text-blue-400 border-blue-800",
  FILLED: "bg-green-900/40 text-green-400 border-green-800",
  CANCELLED: "bg-gray-800 text-gray-500 border-gray-700",
  PENDING: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  SUCCESS: "bg-green-900/40 text-green-400 border-green-800",
  FAILED: "bg-red-900/40 text-red-400 border-red-800",
};

function Badge({ status }: { status: string }) {
  return (
    <span
      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
        statusColor[status] ?? "bg-gray-800 text-gray-400 border-gray-700"
      }`}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/v1/orders/history?limit=50");
        if (res.status === 401) { setError("Please log in."); return; }
        if (!res.ok) throw new Error("Failed to fetch orders");
        const json = await res.json();
        setOrders(json.orders ?? []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingOrders(false);
      }
    };
    fetchOrders();
  }, []);

  // Fetch transactions (deposits)
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await fetch("/api/v1/payments/transactions");
        if (res.ok) {
          const json = await res.json();
          setTransactions(json.transactions ?? []);
        }
        // 404 / 401 are non-fatal — just leave the list empty
      } catch {
        // ignore
      } finally {
        setLoadingTx(false);
      }
    };
    fetchTransactions();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center text-red-400">
        <div className="text-center space-y-3">
          <p>{error}</p>
          <Link href="/login" className="text-yellow-500 underline text-sm">Login →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-gray-200 py-10 px-4 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">History</h1>
        <p className="text-gray-500 text-sm mt-1">Your past orders and deposits.</p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-6 border-b border-gray-800 mb-6 text-sm">
        {(["orders", "deposits"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 font-medium capitalize transition-colors ${
              tab === t
                ? "border-b-2 border-yellow-500 text-yellow-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Orders Tab ── */}
      {tab === "orders" && (
        <>
          {loadingOrders ? (
            <Spinner />
          ) : orders.length === 0 ? (
            <EmptyState message="No orders placed yet." cta={{ label: "Go to Markets", href: "/ticker" }} />
          ) : (
            <div className="bg-[#161a1e] rounded-xl overflow-hidden border border-gray-800">
              {/* Header */}
              <div className="grid grid-cols-6 text-[10px] text-gray-500 uppercase font-mono tracking-widest px-4 py-3 border-b border-gray-800">
                <span>Market</span>
                <span>Side</span>
                <span>Type</span>
                <span className="text-right">Price</span>
                <span className="text-right">Qty / Filled</span>
                <span className="text-right">Status</span>
              </div>
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-6 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors text-sm"
                >
                  <div>
                    <p className="font-mono text-white text-xs font-bold">
                      {o.stock?.symbol ?? "—"}
                    </p>
                    <p className="text-[10px] text-gray-600">{formatDate(o.createdAt)}</p>
                  </div>
                  <span
                    className={`self-center text-xs font-bold ${
                      o.side === "BUY" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {o.side}
                  </span>
                  <span className="self-center text-xs text-gray-400">{o.type}</span>
                  <span className="self-center text-right font-mono text-xs">
                    {parseFloat(o.price).toLocaleString()}
                  </span>
                  <div className="self-center text-right font-mono text-xs">
                    <p className="text-white">{parseFloat(o.quantity).toFixed(4)}</p>
                    <p className="text-green-500">{parseFloat(o.filledQty).toFixed(4)} filled</p>
                  </div>
                  <div className="self-center text-right">
                    <Badge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Deposits Tab ── */}
      {tab === "deposits" && (
        <>
          {loadingTx ? (
            <Spinner />
          ) : transactions.length === 0 ? (
            <EmptyState
              message="No deposits yet."
              cta={{ label: "Add INR Balance", href: "/add-balance" }}
            />
          ) : (
            <div className="bg-[#161a1e] rounded-xl overflow-hidden border border-gray-800">
              <div className="grid grid-cols-4 text-[10px] text-gray-500 uppercase font-mono tracking-widest px-4 py-3 border-b border-gray-800">
                <span>Date</span>
                <span>Type</span>
                <span className="text-right">Amount (INR)</span>
                <span className="text-right">Status</span>
              </div>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-4 px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors text-sm"
                >
                  <p className="text-xs text-gray-400">{formatDate(tx.createdAt)}</p>
                  <span
                    className={`text-xs font-bold ${
                      tx.type === "DEPOSIT" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.type}
                  </span>
                  <p className="text-right font-mono text-white text-xs">
                    ₹{parseFloat(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                  <div className="text-right">
                    <Badge status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Footer Nav ── */}
      <div className="flex gap-4 mt-8 text-sm text-gray-500">
        <Link href="/portfolio" className="hover:text-yellow-400 transition-colors">
          ← Portfolio
        </Link>
        <Link href="/add-balance" className="hover:text-yellow-400 transition-colors">
          Add Balance →
        </Link>
      </div>
    </div>
  );
}

// ─── Tiny Sub-components ───────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500" />
    </div>
  );
}

function EmptyState({ message, cta }: { message: string; cta: { label: string; href: string } }) {
  return (
    <div className="text-center py-16 text-gray-600">
      <p className="text-lg">{message}</p>
      <Link href={cta.href} className="text-yellow-500 underline text-sm mt-2 inline-block">
        {cta.label} →
      </Link>
    </div>
  );
}
