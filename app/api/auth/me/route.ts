import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    console.log(user)
    if (!user)
    {
        return NextResponse.json({ success: false, user : null , error : "Unauthorized"}, { status: 401 });
    }
    else
    {
        return NextResponse.json({success:true, user : user});
    }
    }
    catch(error)
    {
        console.error("[/api/auth/me]", error);
        return NextResponse.json({ success: false, user: null, error: "Internal Server Error" }, { status: 500 });
    }
}