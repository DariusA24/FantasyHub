import type { Metadata } from "next";
import { Inter } from 'next/font/google'; 
import "./globals.css";
import Navbar from "../components/navbar/Navbar";
import Footer from "../components/ui/Footer";
import Providers from "./providers";
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({subsets: ['latin']}); 

export const metadata: Metadata = {
  title: "FantasyHub",
  description: "FantasyHub, make fantasy sports better.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider >
    <html lang="en" suppressHydrationWarning>
      <body
        className={inter.className}
      >
        <Providers>
        <Navbar />
        {children}
        <Footer />
        </Providers>
      </body>
    </html>
    </ClerkProvider>
  );
}
