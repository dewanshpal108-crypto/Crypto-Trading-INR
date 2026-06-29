
export type BinanceRawKline = [
  number, // 0: Open time (Timestamp)
  string, // 1: Open price
  string, // 2: High price
  string, // 3: Low price
  string, // 4: Close price
  string, // 5: Volume
  number, // 6: Close time (Timestamp)
  string, // 7: Quote asset volume
  number, // 8: Number of trades
  string, // 9: Taker buy base asset volume
  string, // 10: Taker buy quote asset volume
  string  // 11: Unused field (Ignore)
];

/**
 * Standardized, parsed object layout utilized across the Next.js/Node.js app ecosystem.
 * Formats strings into clean numbers/Decimals for precision aggregation inputs.
 */
export interface ParsedCandle {
  symbol: string;
  openTime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: Date;
  tradesCount: number;
}

/**
 * Supported Binance candlestick intervals mapped to API string specifications.
 */
export type KlineInterval = '1m' | '5m' | '1h' | '1d';

interface FetchKlinesOptions {
  symbol: string;         // e.g., "BTCUSDT", "SOLUSDT"
  interval: KlineInterval; // e.g., "1m"
  limit?: number;         // Max parameters to retrieve (Default/Max: 1000)
  startTime?: number;     // Epoch millisecond timestamp filter
  endTime?: number;       // Epoch millisecond timestamp filter
}

/**
 * Utility tool to extract historical market data from Binance Public nodes.
 * Used primarily to populate cold time-series database structures (TimescaleDB hypertables).
 */
export async function fetchHistoricalKlines({
  symbol,
  interval,
  limit = 1000,
  startTime,
  endTime,
}: FetchKlinesOptions): Promise<ParsedCandle[]> {
  const baseUrl = 'https://api.binance.com/api/v3/klines';
  
  // Construct dynamic URL parameters matching Binance requirements
  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval: interval,
    limit: limit.toString(),
  });

  if (startTime) params.append('startTime', startTime.toString());
  if (endTime) params.append('endTime', endTime.toString());

  const targetUrl = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Keep revalidation low/disabled for historical seeding endpoints
      next: { revalidate: 0 }, 
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API Error Status ${response.status}: ${errorText}`);
    }

    const rawData: BinanceRawKline[] = await response.json();

    // Map unindexed array data into clean, formatted TypeScript interfaces
    return rawData.map((kline): ParsedCandle => ({
      symbol: symbol.toUpperCase(),
      openTime: new Date(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: new Date(kline[6]),
      tradesCount: kline[8],
    }));
  } catch (error) {
    console.error(`[Binance Utility Failure] Failed fetching klines for ${symbol}:`, error);
    throw error;
  }
}