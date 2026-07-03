// app/api/v1/payments/razorpay/create-order/route.ts
// POST /api/v1/payments/razorpay/create-order
//
// Creates a Razorpay order server-side and returns the order_id + key_id to
// the frontend so Razorpay Checkout can be initialised.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import razorpay from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const user = await auth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse & validate body
    const body = await req.json();
    const amount = Number(body.amount); // Expected in INR (e.g., 500 for ₹500)

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: "Invalid amount. Minimum deposit is ₹1." },
        { status: 400 }
      );
    }

    // 3. Create Razorpay order (amount must be in paise)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: `r_${user.id}`,
      notes: {
        userId: user.id,
        userEmail: user.email,
        purpose: "INR wallet deposit",
      },
    });

    // 4. Return order_id and public key_id to the client
    return NextResponse.json(
      {
        orderId: order.id,
        amount: order.amount,   // in paise
        currency: order.currency,
        keyId: process.env.Test_Api_Key,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Razorpay create-order] Error:", error);
    return NextResponse.json(
      { error: "Failed to create payment order. Please try again." },
      { status: 500 }
    );
  }
}
