import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProviders } from "@/utils/theme-providers";

const OutfitFont = Outfit({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const siteUrl =
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ??
  "https://github.com/Santosh-Pathak/Gemini-Clone";

export const metadata: Metadata = {
  title: {
    default: "Gemini Clone - LangChain Gen AI Assistant",
    template: "%s · Gemini Clone",
  },
  description:
    "Full-stack Gemini-style assistant with LangChain, RAG, agents, multimodal vision, and secure server-side Gemini streaming.",
  keywords: [
    "AI",
    "Gemini",
    "LangChain",
    "RAG",
    "Next.js",
    "Gen AI",
    "MongoDB",
  ],
  authors: [{ name: "Santosh Pathak", url: "https://github.com/Santosh-Pathak" }],
  creator: "Santosh Pathak",
  metadataBase: new URL(siteUrl.startsWith("http") ? siteUrl : "http://localhost:3000"),
  openGraph: {
    title: "Gemini Clone — LangChain Gen AI Assistant",
    description:
      "Streaming chat, RAG, tool-using agents, and vision — built with Next.js and LangChain.js.",
    url: siteUrl,
    siteName: "Gemini Clone",
    images: [{ url: "/assets/gemini-logo.svg", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gemini Clone — LangChain Gen AI Assistant",
    description:
      "Production-minded Gen AI app: secure Gemini API, RAG, agents, and multimodal chat.",
    images: ["/assets/gemini-banner.svg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${OutfitFont.className} dark:bg-[#131314] h-dvh w-full overflow-hidden bg-white text-black dark:text-white`}
      >
        <ThemeProviders>{children}</ThemeProviders>
      </body>
    </html>
  );
}
