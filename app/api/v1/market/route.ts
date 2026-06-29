import {NextResponse} from "next/server";
import prisma from "@/lib/prisma";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");


const USD_TO_INR = 95.70;

interface BinanceTickerPayload {
    symbol: string,
    lastPrice : string,
    priceChange : string,
    priceChangePercent : string,
    volume : string,
    highPrice: string,
    lowPrice: string,
}

export async function GET(){
    try{

        //1. grab the supported pairs from db
        const activeStocks = await prisma.stock.findMany({
            orderBy: {symbol: 'asc'},
        });

        //2 .check the global cache layer inside Redis
        const cachedGlobalStats = await redis.get("market:global:24hr");
        let rawTickerArray: BinanceTickerPayload[] = [];

        if(cachedGlobalStats)
        {
            rawTickerArray = JSON.parse(cachedGlobalStats);
        }else{
            const binanceResponse = await fetch("https://api.binance.com/api/v3/ticker/24hr",{cache: 'no-store'});

            if(!binanceResponse.ok)
            {
                throw new Error("failed fetching from binance public api")
            }

            rawTickerArray = await binanceResponse.json();

            // 3. set the global cache in redis
            await redis.set("market:global:24hr", JSON.stringify(rawTickerArray), "EX", 3);

        }

        //now we will return the formatted response with our local symbols
        const markets = activeStocks.map((stock)=>
        {
            const assetPrefix = stock.symbol.split("_")[0];
            const targetBinanceSymbol  = `${assetPrefix}USDT`;

            const matchStats = rawTickerArray.find((item) => item.symbol === targetBinanceSymbol);

            if(!matchStats){
                return {
                    id: stock.id,
                    title: stock.title,
                    symbol: stock.symbol,
                    lastPrice: "0.00",
                    priceChange24h: "0.00",
                    priceChangePercent24h: "0.00",
                    volume24h: "0.00",
                    high24h: "0.00",
                    low24h: "0.00",
                }
            }
            else{
                return {
                    id: stock.id,
                    title: stock.title,
                    symbol: stock.symbol,
                    lastPrice: (parseFloat(matchStats.lastPrice) * USD_TO_INR).toFixed(2),
                    priceChange24h: (parseFloat(matchStats.priceChange) * USD_TO_INR).toFixed(2),
                    priceChangePercent24h: parseFloat(matchStats.priceChangePercent).toFixed(2),
                    volume24h: parseFloat(matchStats.volume).toFixed(2),
                    high24h: (parseFloat(matchStats.highPrice) * USD_TO_INR).toFixed(2),
                    low24h: (parseFloat(matchStats.lowPrice) * USD_TO_INR).toFixed(2),
                }
            }
        })
        return NextResponse.json({success:true,data:markets});
    }
    catch(error){
        console.error("Error in fetching market data :",error);
        return NextResponse.json({success:false,message:error},{status:500});
    }
}