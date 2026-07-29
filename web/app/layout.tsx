import "./globals.css";
import { Manrope, Fraunces } from "next/font/google";
import React from "react";
import { Toaster } from "react-hot-toast";
import { NetworkStatus } from "@/components/NetworkStatus";
import type { Metadata } from "next";
import { config } from "@/lib/config";
import PageTransition from "@/components/PageTransition";
import { AuthProvider } from "@/lib/auth-context";
import { UsageMonitor } from "@/components/UsageMonitor";

const mainFont = Manrope({
  subsets: ["latin"],
  variable: "--font-main",
  display: "swap",
});

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: config.site.title,
    template: `%s | ${config.company.name}`,
  },
  description: config.site.description,
  keywords: config.site.keywords,
  authors: [{ name: config.company.name }],
  creator: config.company.name,
  metadataBase: new URL(config.site.url),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: config.site.url,
    siteName: config.company.name,
    title: config.site.title,
    description: config.site.description,
    images: [
      {
        url: config.site.ogImage,
        width: 1200,
        height: 630,
        alt: config.site.title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: config.site.title,
    description: config.site.description,
    images: [config.site.ogImage],
    creator: config.social.twitter,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({children,}: Readonly<{ children: React.ReactNode; }>) {
  return (
      <html lang="en" className={`h-full antialiased ${mainFont.variable} ${displayFont.variable}`}>
      <body>
        <UsageMonitor />
        <AuthProvider>
          <NetworkStatus />
          <Toaster
            position="bottom-center"
            toastOptions={{
              style: {
                background: "var(--color-surface-raised)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
                borderRadius: "14px",
                boxShadow: "var(--shadow)",
                fontSize: "14px",
              },
              success: {
                iconTheme: {
                  primary: "var(--color-success)",
                  secondary: "var(--color-text)",
                },
              },
              error: {
                iconTheme: {
                  primary: "var(--color-error)",
                  secondary: "var(--color-surface-raised)",
                },
              },
            }}
          />
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
      </body>
      </html>
  );
}
