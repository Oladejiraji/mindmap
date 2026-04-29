import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const diatype = localFont({
  variable: "--font-diatype",
  display: "swap",
  src: [
    {
      path: "./fonts/diatype/ABCDiatype-Variable.ttf",
      weight: "100 950",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "Mindmap",
  description: "A branching chat app for learning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${diatype.variable}`}
    >
      <body className="min-h-svh">
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
