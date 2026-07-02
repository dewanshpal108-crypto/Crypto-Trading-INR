// app/add-balance/page.tsx
// INR deposit page powered by Razorpay Checkout.
"use client";

import React, { useState } from "react";
import Link from "next/link";

// Razorpay's Checkout is loaded as a script — extend the Window type
declare global {
  interface Window {
    Razorpay: any;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddBalancePage() {
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDeposit = async () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount < 1) {
      setErrorMsg("Please enter a valid amount (min ₹1).");
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Load Razorpay Checkout SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Could not load Razorpay SDK. Check your internet connection.");
      }

      // 2. Create order server-side
      const res = await fetch("/api/v1/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to create payment order.");
      }

      const { orderId, amount: paise, currency, keyId } = await res.json();

      // 3. Open Razorpay Checkout modal
      const options = {
        key: keyId,
        amount: paise,       // in paise
        currency,
        name: "Crypto Trading Platform",
        description: "INR Wallet Deposit",
        order_id: orderId,
        handler: (response: { razorpay_payment_id: string; razorpay_order_id: string }) => {
          // Payment successful on Razorpay's side
          // Actual INR credit happens via the webhook (payment.captured event)
          setSuccessMsg(
            `Payment of ₹${numAmount.toLocaleString()} initiated! ` +
            `Payment ID: ${response.razorpay_payment_id}. ` +
            `Your INR balance will be updated shortly.`
          );
          setAmount("");
        },
        prefill: {
          name: "",   // Optionally pre-fill from user session
          email: "",
        },
        theme: {
          color: "#EAB308", // yellow-500
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", (response: any) => {
        setErrorMsg(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });

      rzp.open();
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-gray-200 flex items-start justify-center py-16 px-4">
      <div className="w-full max-w-md">

        {/* ── Header ── */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Add Balance</h1>
          <p className="text-gray-500 text-sm mt-2">
            Deposit INR into your trading wallet instantly via Razorpay.
          </p>
        </div>

        {/* ── Deposit Card ── */}
        <div className="bg-[#161a1e] border border-gray-800 rounded-2xl p-6 space-y-6">

          {/* Preset amount buttons */}
          <div>
            <p className="text-xs text-gray-500 uppercase font-mono tracking-widest mb-3">
              Quick Select
            </p>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className={`py-2 text-xs font-mono rounded border transition-colors ${
                    amount === String(a)
                      ? "bg-yellow-500 text-black border-yellow-500 font-bold"
                      : "border-gray-700 text-gray-400 hover:border-yellow-600 hover:text-white"
                  }`}
                >
                  ₹{a >= 1000 ? `${a / 1000}K` : a}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount input */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 uppercase font-mono tracking-widest">
              Custom Amount (INR)
            </label>
            <div className="flex items-center bg-[#2b3139] rounded-lg px-4 py-3 border border-gray-700 focus-within:border-yellow-600 transition-colors">
              <span className="text-gray-400 text-lg mr-2">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount…"
                className="bg-transparent w-full outline-none font-mono text-white text-lg placeholder-gray-600"
              />
            </div>
          </div>

          {/* Info row */}
          <div className="flex justify-between text-xs text-gray-500 font-mono">
            <span>Min. deposit</span>
            <span>₹1</span>
          </div>

          {/* Success / Error feedback */}
          {successMsg && (
            <div className="bg-green-950/50 border border-green-900 text-green-400 rounded-lg p-4 text-xs">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-950/50 border border-red-900 text-red-400 rounded-lg p-4 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handleDeposit}
            disabled={isProcessing || !amount}
            className={`w-full py-4 rounded-xl text-base font-black transition-opacity ${
              isProcessing || !amount
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-yellow-500 text-black hover:bg-yellow-400"
            }`}
          >
            {isProcessing ? "Opening Checkout…" : `Pay ₹${parseFloat(amount || "0").toLocaleString() || "—"}`}
          </button>

          {/* Legal note */}
          <p className="text-[10px] text-gray-600 text-center">
            Payments secured by{" "}
            <span className="text-gray-500 font-semibold">Razorpay</span>. Test mode — no real money is charged.
          </p>
        </div>

        {/* ── Footer Links ── */}
        <div className="flex justify-center gap-6 mt-6 text-sm text-gray-500">
          <Link href="/portfolio" className="hover:text-yellow-400 transition-colors">
            ← Portfolio
          </Link>
          <Link href="/profile/history" className="hover:text-yellow-400 transition-colors">
            Deposit History →
          </Link>
        </div>
      </div>
    </div>
  );
}
