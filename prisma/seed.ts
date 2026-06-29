import { PrismaClient} from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({
  adapter,
});

interface StockSeedItem {
  title: string;
  symbol: string;
}

// Defining the initial trading pairs for the Indian Rupee (INR) crypto market
const INITIAL_STOCKS: StockSeedItem[] = [
  { title: "Bitcoin", symbol: "BTC_INR" },
  { title: "Ethereum", symbol: "ETH_INR" },
  { title: "Solana", symbol: "SOL_INR" },
  { title: "Ripple", symbol: "XRP_INR" },
  { title: "Cardano", symbol: "ADA_INR" },
];

async function main() {

  await Promise.all(
    INITIAL_STOCKS.map(async (stock) => {
      const result = await prisma.stock.create({
        data: {
          title: stock.title,
          symbol: stock.symbol,
        },
      });
    })
  );

}

main()
  .then(async () => {
    console.log("Database market stock seed completed successfully.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

