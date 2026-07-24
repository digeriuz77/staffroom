import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AuthProvider } from "@/components/AuthProvider";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { CompareTray } from "@/components/CompareTray";
import { BuyMeACoffee } from "@/components/BuyMeACoffee";
import { BottomTabBar } from "@/components/BottomTabBar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07090f",
};

export const metadata: Metadata = {
  title: "Staffroom Intel — Honest intelligence for international teachers",
  description:
    "Paste a job link and instantly see how the salary compares to real verified packages, what your purchasing power and savings look like, and what teachers actually say about the school.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Staffroom Intel",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased pb-20 md:pb-0`}>
        <AuthProvider>
          <CurrencyProvider>
            <SiteNav />
            {children}
            <SiteFooter />
            <CompareTray />
            <BuyMeACoffee />
            <BottomTabBar />
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
