import type { Metadata, Viewport } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "ApexVision AI — Motorsport Intelligence Platform",
    template: "%s | ApexVision AI",
  },
  description:
    "Real-Time AI-Powered Motorsport Intelligence. IBM Granite, Watsonx.ai, " +
    "YOLOv8 computer vision, LangFlow orchestration, Docling regulation intelligence.",
  keywords: [
    "motorsport", "AI", "IBM Granite", "Watsonx.ai", "Formula 1",
    "race analytics", "computer vision", "YOLOv8", "LangFlow", "Docling",
  ],
  authors: [{ name: "ApexVision AI" }],
  manifest: "/manifest.json",
  openGraph: {
    title: "ApexVision AI — Motorsport Intelligence Platform",
    description: "Real-Time AI Motorsport Intelligence. IBM SkillsBuild AI Builders Challenge.",
    type: "website",
    siteName: "ApexVision AI",
  },
  robots: "index, follow",
};

export const viewport: Viewport = {
  themeColor: "#00E5FF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@300;400;500;600;700;800;900&family=Rajdhani:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-apex-black text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
