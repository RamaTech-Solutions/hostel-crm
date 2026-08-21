import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getAppUrl } from "@/lib/app-url";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "PG Management Software for India | Awaasly",
    template: "%s · Awaasly",
  },
  description:
    "Awaasly is PG management software for Indian PG and hostel owners. Manage multiple properties, residents, rooms, beds, occupancy and rent collection from one place.",
  keywords: [
    "PG management software",
    "hostel management",
    "PG occupancy",
    "rent collection",
    "multi-property PG",
    "Awaasly",
  ],
  applicationName: "Awaasly",
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Awaasly — Run every PG from one place",
    description:
      "Manage residents, occupancy, rooms, beds and rent across every PG you operate — built for Indian PG and hostel owners.",
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
