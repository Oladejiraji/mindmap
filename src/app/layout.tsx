import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Exo_2,
  Geist,
  Geist_Mono,
  Google_Sans,
} from "next/font/google";
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

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
  display: "swap",
  weight: "600",
});

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
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

const interDisplay = localFont({
  variable: "--font-inter-display",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/inter-display/InterDisplay-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/inter-display/InterDisplay-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/inter-display/InterDisplay-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/inter-display/InterDisplay-Bold.woff2",
      weight: "700",
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
      className={`${geistSans.variable} ${geistMono.variable} ${diatype.variable} ${interDisplay.variable} ${bricolage.variable} ${exo2.variable} ${googleSans.variable}`}
    >
      <body className="min-h-svh">
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}
