import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Slide, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import StoreProvider from "./StoreProvider";
import Navbar from "./components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TradeX — Crypto Trading Platform",
  description: "Real-time cryptocurrency trading with live orderbook, advanced charts, and secure INR deposits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{
        fontFamily: "var(--font-sans)",
      }}>
        <StoreProvider>
          <Navbar />
          <main style={{ flex: 1 }}>
            {children}
          </main>
          <ToastContainer  
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          transition={Slide}
          />
        </StoreProvider>
      </body>
    </html>
  );
}
