'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

interface MarketMetrics {
  id: string
  title: string
  symbol: string
  lastPrice: string
  priceChange24h: string
  priceChangePercent24h: string
  volume24h: string
  high24h: string
  low24h: string
}

export default function TickerPage() {
  const [markets, setMarkets] = useState<MarketMetrics[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const prevPricesRef = useRef<Record<string, number>>({})
  const [flashStates, setFlashStates] = useState<Record<string, 'up' | 'down' | null>>({})

  useEffect(() => {
    async function updateMarketBoard() {
      try {
        const response = await fetch('/api/v1/market')
        const data = await response.json()

        if (data.success && data.data) {
          const nextFlashStates: Record<string, 'up' | 'down' | null> = {}
          const currentPricesMap: Record<string, number> = {}

          data.data.forEach((updatedAsset: MarketMetrics) => {
            const currentNumericPrice = parseFloat(updatedAsset.lastPrice)
            const historicalNumericPrice = prevPricesRef.current[updatedAsset.symbol]

            // Contrast current values with old history to trigger flash animations
            if (historicalNumericPrice && historicalNumericPrice !== currentNumericPrice) {
              if (currentNumericPrice > historicalNumericPrice) {
                nextFlashStates[updatedAsset.symbol] = 'up'
              } else {
                nextFlashStates[updatedAsset.symbol] = 'down'
              }
            }
            currentPricesMap[updatedAsset.symbol] = currentNumericPrice
          })

          // Set active animation and set wrapper to clear after 700ms
          if (Object.keys(nextFlashStates).length > 0) {
            setFlashStates(nextFlashStates)
            setTimeout(() => setFlashStates({}), 700)
          }

          prevPricesRef.current = currentPricesMap
          setMarkets(data.data)
        }
        setLoading(false)
      } catch (err) {
        console.error("Failed fetching updated dashboard stats:", err)
        setLoading(false)
      }
    }

    updateMarketBoard()

    // Poll every 5 seconds for live price updates
    const interval = setInterval(updateMarketBoard, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 border-b border-slate-900 pb-6">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 pb-2">Crypto Markets</h1>
          <p className="text-slate-400">Live trading pairs track global order books and indices instantly.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {markets.map((market) => {
            const percentageValue = parseFloat(market.priceChangePercent24h)
            const isGreenTrend = percentageValue >= 0
            const activeFlash = flashStates[market.symbol]

            // Dynamic class allocation to animate borders on price changes
            let cardBorders = "bg-slate-900/60 border-slate-800/80"
            if (activeFlash === 'up') cardBorders = "bg-emerald-950/30 border-emerald-500 shadow-emerald-900/10 scale-[1.01]"
            if (activeFlash === 'down') cardBorders = "bg-rose-950/30 border-rose-500 shadow-rose-900/10 scale-[1.01]"

            return (
              <div 
                key={market.id} 
                className={`border rounded-xl p-6 shadow-2xl transition-all duration-300 transform ${cardBorders}`}
              >
                {/* Header Section */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-white">{market.title}</h3>
                    <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md">
                      {market.symbol.replace('_', ' / ')}
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md ${
                    isGreenTrend ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {isGreenTrend ? '▲ +' : '▼ '}{market.priceChangePercent24h}%
                  </span>
                </div>

                {/* Primary Price Metric */}
                <div className="my-6">
                  <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-widest mb-1">Last Traded Price</span>
                  <div className="text-3xl font-black font-mono tracking-tight text-slate-100">
                    ₹{parseFloat(market.lastPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Grid Layout Sub-Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/50 text-xs font-mono text-slate-400 mb-6">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">24h High</span>
                    <span className="text-slate-200">₹{parseFloat(market.high24h).toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase mb-0.5">24h Volume</span>
                    <span className="text-slate-200">{parseFloat(market.volume24h).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Trading View Gateway Button */}
                <Link 
                  href={`/spot/${market.symbol}`}
                  className="btn btn-primary btn-full"
                >
                  Open Spot Orderbook
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}