import Freecurrencyapi from "@everapi/freecurrencyapi-js";
import { NextResponse } from "next/server";

const freecurrencyapi = new Freecurrencyapi(process.env.FREE_CURRENCY_API_KEY ?? 'fca_live_J5qJqXqJqJqJqJqJqJqJqJqJqJqJqJqJq');

export async function GET() {
    try {
        const response = await freecurrencyapi.latest({
            base_currency: 'USD',
            currencies: 'INR'
        });
        return NextResponse.json({ success: true, data: response?.data?.INR });
    } catch (error) {
        console.error("Error fetching currency conversion:", error);
        return NextResponse.json({ success: false, message: error }, { status: 500 });
    }
}