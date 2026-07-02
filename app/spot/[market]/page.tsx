// app/spot/[market]/page.tsx
"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Orderbook from "@/app/components/Orderbook";
import Chart from "@/app/components/Chart";
import OrderForm from "@/app/components/OrderForm";

export default function SpotTradingPage() {
  const params = useParams();
  const market = ((params?.market as string) || "BTC_INR").toUpperCase();

  /**
   * Lifted state: when the user clicks an orderbook row the price bubbles up
   * here and is passed down to OrderForm so the price input gets auto-filled.
   */
  const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0b0e11] text-gray-200 p-2 grid grid-cols-1 lg:grid-cols-4 gap-2">
      {/* ─── LEFT: Live Orderbook (1 col) ─── */}
      <Orderbook symbol={market} onPriceClick={setSelectedPrice} />

      {/* ─── CENTER: Candlestick Chart (2 cols) ─── */}
      <div className="lg:col-span-2">
        <Chart symbol={market} />
      </div>

      {/* ─── RIGHT: Order Form (1 col) ─── */}
      <OrderForm symbol={market} selectedPrice={selectedPrice} />
    </div>
  );
}