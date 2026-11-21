import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://common-room-v1.vercel.app"),
  title: {
    default: "Common Room | Year 12",
    template: "%s | Common Room",
  },
  description:
    "Earn points for helping out in the Year 12 common room, track your balance and redeem rewards.",
  applicationName: "Common Room",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Common Room",
    title: "Common Room | Year 12",
    description:
      "Earn points for helping out in the Year 12 common room, track your balance and redeem rewards.",
    url: "/",
    locale: "en_AU",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Common Room - Year 12 points and rewards",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Common Room | Year 12",
    description:
      "Earn points for helping out in the Year 12 common room, track your balance and redeem rewards.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
