import {NextResponse , NextRequest} from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Status } from "@/app/generated/prisma/client";


export async function GET(req: NextRequest) {
  try {
    // 1. Authentication
    const user = await auth(req);
    if (!user) {
        return NextResponse.json({ message: "Unauthrized" }, { status: 401 });
    }

    // 2. Extract and parse query parameters
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const statusParam = searchParams.get("status"); 

    // Default to fetching the 50 most recent orders if no limit is provided
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    // Build the query constraints
    const whereClause: any = { 
      userId: user.id
    };

    // Allow the frontend to filter by Status (e.g., ?status=OPEN)
    if (statusParam && Object.values(Status).includes(statusParam as Status)) {
      whereClause.status = statusParam as Status;
    }

    // 3. Fetch from database
    const orders = await prisma.order.findMany({
      where: whereClause,
      // Sort so the newest orders appear at the top
      // (Assumes a standard 'createdAt' field or falls back to standard UUID/CUID sorting if needed. 
      // If your schema uses something else, adjust this to match).
      orderBy: {
        createdAt: 'desc' // Assuming you have a createdAt timestamp field in your Order model  
      },
      take: limit,
      // Optional: If you want to include the stock symbol in the response, 
      // uncomment the lines below (assuming the relation is named 'stock' in schema.prisma)
      /*
      include: {
        stock: {
          select: { symbol: true }
        }
      }
      */
    });

    // 4. Return success response
    return NextResponse.json({
      message: "Order history fetched successfully",
      orders,
    }, { status: 200 });

  } catch (error: any) {
    console.error("Order History Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}