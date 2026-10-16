import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ConvexClientProvider } from "@/providers/convex-client-provider";
import { Toaster } from "@/components/ui/sonner";
import { Agentation } from "agentation";

const inter = Inter({
  variable: "--font-inter",
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
  description: "A spatial research tool for thinking through problems with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} ${diatype.variable}`}
    >
      <body className="min-h-svh">
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Toaster richColors position="bottom-right" />
        {process.env.NODE_ENV === "development" && (
          <Agentation endpoint="http://localhost:4747" />
        )}
      </body>
    </html>
  );
}
