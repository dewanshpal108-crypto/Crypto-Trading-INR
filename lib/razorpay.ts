// lib/razorpay.ts
// Singleton Razorpay instance — reused across API routes.

import Razorpay from "razorpay";

if (!process.env.Test_Api_Key || !process.env.Test_Api_Secret) {
  throw new Error(
    "[Razorpay] Missing env vars: Test_Api_Key and Test_Api_Secret must be set in .env"
  );
}

const razorpay = new Razorpay({
  key_id: process.env.Test_Api_Key,
  key_secret: process.env.Test_Api_Secret,
});

export default razorpay;
