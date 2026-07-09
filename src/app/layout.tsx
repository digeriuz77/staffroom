import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { AuthProvider } from "@/components/AuthProvider";
import { CurrencyProvider } from "@/components/CurrencyProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Staffroom Intel — Honest intelligence for international teachers",
  description:
    "Paste a job link and instantly see how the salary compares to real verified packages, what your purchasing power and savings look like, and what teachers actually say about the school.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <CurrencyProvider>
            <SiteNav />
            {children}
          </CurrencyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
