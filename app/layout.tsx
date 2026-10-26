import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Inter, Rajdhani } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
});

const origin = process.env.APP_ORIGIN || "https://leadflow.insolla.ai";
const description = "Turn an inquiry into an organized lead, missing details, and a reply for review.";
const image = {
  url: "/thumbnail.png",
  width: 1732,
  height: 908,
  alt: "LeadFlow turns an inquiry into organized facts, flags a missing email, and drafts a reply for review.",
};

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: "Insolla LeadFlow | Inquiry to next step",
  description,
  openGraph: {
    title: "Insolla LeadFlow",
    description,
    url: origin,
    siteName: "Insolla LeadFlow",
    type: "website",
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: "Insolla LeadFlow",
    description,
    images: [image],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${rajdhani.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Script id="insolla-theme" strategy="beforeInteractive">
          {`try{var t=localStorage.getItem("insolla-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`}
        </Script>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
