import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {

    const cookie = request.cookies.get("token");

    const response = NextResponse.json({ success: true })
    if(cookie)
    {
        response.cookies.delete("token");
    }

    return response
}