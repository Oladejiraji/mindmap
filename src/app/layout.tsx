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

// Inter Display (Inter at optical size 32, medium), its own family so the
// app's Inter is untouched. Static latin file from Google Fonts. Used by
// `.font-display`.
const interDisplay = localFont({
  src: "./fonts/inter-display-500.woff2",
  weight: "500",
  variable: "--font-inter-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${inter.variable} ${interDisplay.variable} ${geistMono.variable}`}
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
