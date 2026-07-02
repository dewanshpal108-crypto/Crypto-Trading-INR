import {NextRequest, NextResponse} from "next/server";
import { getDepth } from "@/lib/orderbook";

export async function GET(req : NextRequest){
    try{
        const { searchParams} = new URL(req.url);
        const symbol = searchParams.get("symbol");

        if(!symbol){
            return NextResponse.json({error : "Missing symbol parameter in query string"}, {status : 400});
        }

        const upperSymbol = symbol.toUpperCase();

        const orderbookDepth = await getDepth(upperSymbol,50);

        return NextResponse.json({ message: "Orderbook data retrieved successfully", marketData: orderbookDepth },{status : 200 });
    } catch(error:any){
        console.error("Error retrieving orderbook data:", error);
        return NextResponse.json({error : "Internal Server Error"}, {status : 500})
    }
}