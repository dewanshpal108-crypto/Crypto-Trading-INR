import { NextRequest, NextResponse } from "next/server"
import { Side, Type, Status } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { matchOrders, PlaceOrderInput } from "@/lib/orderbook";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        //authenticate user
        const user = await auth(req);
        if (!user) {
            return NextResponse.json({ message: "Unauthrized" }, { status: 401 });
        }

        //parse and validate input
        const body = await req.json();
        const { symbol, side, type, price, quantity } = body;

        if (!symbol || !side || !type || price <= 0 || quantity <= 0) {
            return NextResponse.json({ message: "Invalid input" }, { status: 400 });
        }
        const [baseAsset, quoteAsset] = symbol.split("_"); //eg "BTC_INR" => baseAsset = "BTC" , quoteAsset = "INR"

        //determine which Asset needs to be locked
        const requiredAsset = side === Side.BUY ? quoteAsset : baseAsset;
        const requiredAmount = side === Side.BUY ? price * quantity : quantity;

        //locking funds and create the order
        const order = await prisma.$transaction(async (tx) => {
            //fetch stock id
            const stock = await tx.stock.findFirst({
                where: { symbol }
            });
            if (!stock) throw new Error("Invalid trading pair");

            //fetch and validate wallet balance
            const wallet = await tx.wallet.findUnique({
                where: {
                    userId_assetSymbol: {
                        userId: user.id,
                        assetSymbol: requiredAsset
                    }
                }
            })

            if (!wallet || wallet.availableBalance < requiredAmount) {
                throw new Error("Insufficient Balance to execute the Order");

            }

            //lets lock the funds and create the order
            await tx.wallet.update(
                {
                    where: { id: wallet.id },
                    data: {
                        availableBalance: { decrement: requiredAmount },
                        lockedBalance: { increment: requiredAmount }
                    }
                }
            );

            const newOrder = await tx.order.create({
                data:
                {
                    userId: user.id,
                    stockId: stock.id,
                    side,
                    type : Type[type as keyof typeof Type],
                    price,
                    quantity,
                    filledQty: 0,
                    status: Status.OPEN,
                }
            })

            return newOrder;
        })

        // triggering the matching engine to match the order
        const orderInput: PlaceOrderInput = {
            userId: order.userId,
            stockId: order.stockId,
            symbol,
            side,
            type : Type[type as keyof typeof Type],
            price,
            quantity,
        };

        const matchResult = await matchOrders(order.id, orderInput);

        return NextResponse.json({
            message: "Order Placed Successfully ",
            orderId: order.id,
            matchResult
        }, { status: 201 });
    } catch (err: any) {
        if (err.message === "Insufficient Balance to execute the Order" || err.message === "Invalid trading pair") {
            return NextResponse.json({ message: err.message }, { status: 400 });
        }

        console.error("Error placing order:", err);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}