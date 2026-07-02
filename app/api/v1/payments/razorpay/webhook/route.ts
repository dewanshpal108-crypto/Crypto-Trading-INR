// app/api/v1/payments/razorpay/webhook/route.ts
// POST /api/v1/payments/razorpay/webhook
//
// Razorpay calls this endpoint after a payment event.
// We verify the HMAC signature, then credit the user's INR wallet.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { TransactionType, TxStatus } from "@/app/generated/prisma/client";

// Razorpay sends the raw body as a string — we must read it as text, not JSON,
// to verify the HMAC signature correctly.
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    // 1. Verify HMAC-SHA256 signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex")
    );

    if (!isValid) {
      console.warn("[Razorpay Webhook] Invalid signature — possible spoofed request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // 2. Parse verified payload
    const event = JSON.parse(rawBody);

    // We only care about successful payments
    if (event.event !== "payment.captured") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const payment = event.payload?.payment?.entity;
    if (!payment) {
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }

    const userId: string = payment.notes?.userId;
    const razorpayOrderId: string = payment.order_id;
    const amountPaise: number = payment.amount; // in paise
    const amountINR = amountPaise / 100;

    if (!userId || !razorpayOrderId) {
      console.error("[Razorpay Webhook] Missing userId or order_id in payment notes");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // 3. Idempotency: if this payment was already processed, skip gracefully
    const existing = await prisma.transaction.findUnique({
      where: { providerReference: razorpayOrderId },
    });

    if (existing) {
      console.info(`[Razorpay Webhook] Duplicate webhook for order ${razorpayOrderId} — skipping`);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 4. Credit INR wallet + record transaction in a single Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Upsert the INR wallet (create if first deposit)
      await tx.wallet.upsert({
        where: { userId_assetSymbol: { userId, assetSymbol: "INR" } },
        update: { availableBalance: { increment: amountINR } },
        create: {
          userId,
          assetSymbol: "INR",
          availableBalance: amountINR,
          lockedBalance: 0,
        },
      });

      // Record the transaction for the history page
      await tx.transaction.create({
        data: {
          userId,
          amount: amountINR,
          type: TransactionType.DEPOSIT,
          status: TxStatus.SUCCESS,
          providerReference: razorpayOrderId,
        },
      });
    });

    console.info(`[Razorpay Webhook] ₹${amountINR} credited to user ${userId}`);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Razorpay Webhook] Unhandled error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
