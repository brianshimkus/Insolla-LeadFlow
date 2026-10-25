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

export const metadata: Metadata = {
  title: "Insolla LeadFlow | Inquiry to next step",
  description: "Turn an inquiry into an organized lead, missing details and a reply for review.",
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
      </body>
    </html>
  );
}
