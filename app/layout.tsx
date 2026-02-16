import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Songs That Feel Like This",
  description: "Upload an image, discover songs that match its vibe. AI-powered music recommendations based on visual mood and atmosphere.",
  keywords: ["music", "recommendations", "AI", "Spotify", "image analysis", "mood"],
  authors: [{ name: "Songs That Feel Like This" }],
  openGraph: {
    title: "Songs That Feel Like This",
    description: "Upload an image, discover songs that match its vibe",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
