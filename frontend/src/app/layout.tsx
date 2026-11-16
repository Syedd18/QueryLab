import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

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
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-canvas text-fg font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
