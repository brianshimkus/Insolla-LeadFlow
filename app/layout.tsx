import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insolla LeadFlow | Inquiry to next step",
  description: "Turn an inquiry into an organized lead, missing details and a reply for review.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
