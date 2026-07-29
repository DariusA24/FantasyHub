import type { Metadata, Viewport } from "next";
import { Inter, Zilla_Slab } from 'next/font/google';
import "./globals.css";
import Navbar from "../components/navbar/Navbar";
import Footer from "../components/ui/Footer";
import Providers from "./providers";
import ServiceWorkerRegister from "../components/pwa/ServiceWorkerRegister";
import InstallPrompt from "../components/pwa/InstallPrompt";
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({subsets: ['latin']});
const zillaSlab = Zilla_Slab({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-slab' });

export const metadata: Metadata = {
  title: "LeagueShelf",
  description: "LeagueShelf, make fantasy sports better.",
  applicationName: "LeagueShelf",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LeagueShelf",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
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
        className={`${inter.className} ${zillaSlab.variable}`}
      >
        <Providers>
        <ServiceWorkerRegister />
        <Navbar />
        {children}
        <Footer />
        <InstallPrompt />
        </Providers>
      </body>
    </html>
    </ClerkProvider>
  );
}
