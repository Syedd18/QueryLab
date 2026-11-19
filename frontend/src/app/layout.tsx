import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

/* Self-hosted type system:
   Instrument Sans  — interface
   Instrument Serif — editorial display (page titles, hero lines)
   IBM Plex Mono    — SQL, data, and technical labels
   Space Grotesk    — the qryntiq logotype only */
const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
});
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});
const brand = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "qryntiq",
    template: "%s · qryntiq",
  },
  description:
    "A dedicated environment for deliberate SQL practice, real-world problems, and interview preparation.",
  keywords: ["SQL", "practice", "database", "learning", "interview"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full ${sans.variable} ${serif.variable} ${mono.variable} ${brand.variable}`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-fg font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
