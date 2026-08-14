import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hostel-crm.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Awaasly — Every property. One place.",
    template: "%s · Awaasly",
  },
  description: "PG & Hostel Operations Platform. Manage properties, rooms, residents and collections from one place. A product of Ramatech Innovation Pvt Ltd.",
  applicationName: "Awaasly",
  icons: {
    icon: "/brand/favicon.svg",
    shortcut: "/brand/favicon.svg",
  },
  openGraph: {
    title: "Awaasly — Run all your PGs from one place",
    description: "PG & Hostel Operations Platform by Ramatech Innovation Pvt Ltd.",
    url: appUrl,
    siteName: "Awaasly",
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
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
