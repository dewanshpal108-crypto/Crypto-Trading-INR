import Link from "next/link";

const features = [
  {
    icon: "📊",
    title: "Live Orderbook",
    description: "Real-time bid/ask depth powered by Redis sorted sets with sub-millisecond updates.",
  },
  {
    icon: "📈",
    title: "Advanced Charts",
    description: "Professional TradingView candles with 1m, 5m, 1h, and 1d resolutions via TimescaleDB.",
  },
  {
    icon: "⚡",
    title: "Instant Matching",
    description: "In-memory matching engine executes limit and market orders with zero delay.",
  },
  {
    icon: "🔐",
    title: "Secure Ledger",
    description: "Atomic PostgreSQL transactions protect your balances with full audit trails.",
  },
  {
    icon: "💳",
    title: "INR Deposits",
    description: "Seamless Razorpay integration for instant INR deposits to your trading wallet.",
  },
  {
    icon: "🌐",
    title: "Live Market Data",
    description: "Real-time price feeds mirrored from Binance for accurate market tracking.",
  },
];

const tickers = [
  { symbol: "BTC/INR", price: "₹56,42,300", change: "+2.34%", positive: true },
  { symbol: "ETH/INR", price: "₹2,18,450", change: "+1.87%", positive: true },
  { symbol: "SOL/INR", price: "₹12,580", change: "-0.42%", positive: false },
  { symbol: "XRP/INR", price: "₹62.40", change: "+5.12%", positive: true },
];

export default function Home() {
  return (
    <div style={{ overflow: "hidden" }}>
      {/* Hero Section */}
      <section style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "calc(100vh - 64px)",
        padding: "48px 24px",
        textAlign: "center",
      }}>
        {/* Background glow effects */}
        <div style={{
          position: "absolute",
          top: "-200px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 192, 135, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute",
          bottom: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(30, 144, 255, 0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Badge */}
        <div className="animate-fade-in" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 16px",
          borderRadius: "9999px",
          background: "var(--accent-green-muted)",
          border: "1px solid rgba(0, 192, 135, 0.2)",
          marginBottom: "24px",
          fontSize: "0.8rem",
          fontWeight: 600,
          color: "var(--accent-green)",
        }}>
          <span style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "var(--accent-green)",
            boxShadow: "0 0 8px var(--accent-green)",
          }} />
          Live Trading Active
        </div>

        {/* Main Heading */}
        <h1 className="animate-fade-in-up" style={{
          fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-0.03em",
          marginBottom: "20px",
          maxWidth: "700px",
        }}>
          Trade Crypto with{" "}
          <span className="gradient-text">Precision</span>
        </h1>

        {/* Subtitle */}
        <p className="animate-fade-in-up stagger-1" style={{
          fontSize: "1.1rem",
          color: "var(--text-secondary)",
          maxWidth: "520px",
          lineHeight: 1.6,
          marginBottom: "36px",
        }}>
          A high-performance exchange with live orderbooks, advanced charting,
          and instant order execution — all powered by real market data.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up stagger-2" style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "64px",
        }}>
          <Link href="/signup" className="btn btn-primary btn-lg" style={{ textDecoration: "none" }}>
            Get Started
          </Link>
          <Link href="/ticker" className="btn btn-ghost btn-lg" style={{ textDecoration: "none" }}>
            View Markets →
          </Link>
        </div>

        {/* Live Ticker Strip */}
        <div className="animate-fade-in-up stagger-3" style={{
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {tickers.map((t) => (
            <div key={t.symbol} className="card" style={{
              padding: "16px 24px",
              minWidth: "180px",
              textAlign: "left",
              cursor: "pointer",
            }}>
              <div style={{
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                marginBottom: "4px",
                fontWeight: 500,
              }}>
                {t.symbol}
              </div>
              <div style={{
                fontSize: "1.1rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                fontFamily: "var(--font-mono)",
              }}>
                {t.price}
              </div>
              <div style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: t.positive ? "var(--accent-green)" : "var(--accent-red)",
                marginTop: "4px",
              }}>
                {t.change}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section style={{
        padding: "80px 24px",
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h2 style={{
            fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
            fontWeight: 700,
            marginBottom: "12px",
          }}>
            Built for Serious Traders
          </h2>
          <p style={{
            color: "var(--text-secondary)",
            maxWidth: "480px",
            margin: "0 auto",
          }}>
            Enterprise-grade infrastructure running on PostgreSQL, Redis, and TimescaleDB.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "20px",
        }}>
          {features.map((f, i) => (
            <div key={f.title} className={`card animate-fade-in-up stagger-${i + 1}`} style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                background: "var(--bg-tertiary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 600 }}>{f.title}</h3>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{
        padding: "80px 24px",
        textAlign: "center",
        borderTop: "1px solid var(--border-primary)",
      }}>
        <h2 style={{
          fontSize: "clamp(1.5rem, 3vw, 2rem)",
          fontWeight: 700,
          marginBottom: "16px",
        }}>
          Ready to start trading?
        </h2>
        <p style={{
          color: "var(--text-secondary)",
          marginBottom: "28px",
          maxWidth: "400px",
          margin: "0 auto 28px",
        }}>
          Create your account in seconds and access live crypto markets.
        </p>
        <Link href="/signup" className="btn btn-primary btn-lg" style={{ textDecoration: "none" }}>
          Create Free Account
        </Link>
      </section>
    </div>
  );
}
