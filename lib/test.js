/**
 * Test script to isolate and verify the raw data structure 
 * returned by the Binance /api/v3/ticker/24hr public endpoint.
 */
async function testBinanceTicker() {
  console.log("🚀 Initializing live test call to Binance Public REST API...");
  
  // Target test variables mimicking your PostgreSQL Stock pairs
  const targetTokens = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  const url = "https://api.binance.com/api/v3/ticker/24hr";

  try {
    const start = Date.now();
    const response = await fetch(url);
    const duration = Date.now() - start;

    if (!response.ok) {
      throw new Error(`HTTP Error Status: ${response.status}`);
    }

    const rawArray = await response.json();
    console.log(`\n✅ API Request Completed in ${duration}ms.`);
    console.log(`📊 Total elements returned in raw array: ${rawArray.length}`);

    // Filter down to show exactly what your relevant pairs look like
    const filteredMatches = rawArray.filter(item => targetTokens.includes(item.symbol));

    console.log("\n=======================================================");
    console.log("🔍 RAW PACKET SPECIMEN FOR SOLUSDT / BTCUSDT:");
    console.log("=======================================================");
    console.log(JSON.stringify(filteredMatches, null, 2));
    console.log("=======================================================");
    
    console.log("\n💡 Observation Checklist for your Next.js Route logic:");
    console.log(`1. Last Traded Price lives in the "lastPrice" string property.`);
    console.log(`2. 24h Percentage Change is a signed string under "priceChangePercent".`);
    console.log(`3. Volumes track raw coins traded via "volume" (e.g., total BTC, not USD value).`);

  } catch (error) {
    console.error("❌ Test execution encountered a network or payload crash:", error);
  }
}

testBinanceTicker();