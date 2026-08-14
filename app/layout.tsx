import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import "./marketing.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000").split(",")[0].trim();
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0].trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https" ? forwardedProtocol : host.startsWith("localhost") ? "http" : "https";
  let metadataBase: URL;
  try { metadataBase = new URL(`${protocol}://${host}`); } catch { metadataBase = new URL("http://localhost:3000"); }

  return {
    metadataBase,
    title: "ClarIA | Entiende cada cambio de tu recibo",
    description: "Descubre por qué cambió tu recibo Movistar con explicaciones claras y causas respaldadas por evidencia.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "ClarIA | Tu recibo, explicado",
      description: "Causas verificadas. Cero cifras inventadas.",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "ClarIA, tu recibo explicado" }],
    },
    twitter: { card: "summary_large_image", title: "ClarIA | Tu recibo, explicado", description: "Causas verificadas. Cero cifras inventadas.", images: ["/og.png"] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
