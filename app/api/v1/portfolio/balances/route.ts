// app/api/v1/portfolio/balances/route.ts
// GET /api/v1/portfolio/balances
//
// Returns all wallet balances for the authenticated user.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch all wallets for this user
    const wallets = await prisma.wallet.findMany({
      where: { userId: user.id },
      orderBy: { assetSymbol: "asc" },
      select: {
        id: true,
        assetSymbol: true,
        availableBalance: true,
        lockedBalance: true,
        updatedAt: true,
      },
    });

    // 3. Shape into a clean response
    const balances = wallets.map((w) => ({
      asset: w.assetSymbol,
      available: Number(w.availableBalance),
      locked: Number(w.lockedBalance),
      total: Number(w.availableBalance) + Number(w.lockedBalance),
      updatedAt: w.updatedAt,
    }));

    // Compute total portfolio value in INR (INR balance + locked INR)
    const inrBalance = balances.find((b) => b.asset === "INR");
    const totalINR = inrBalance?.total ?? 0;

    return NextResponse.json(
      {
        message: "Portfolio balances fetched successfully",
        balances,
        summary: {
          totalAssets: balances.length,
          totalINR,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Portfolio Balances] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
