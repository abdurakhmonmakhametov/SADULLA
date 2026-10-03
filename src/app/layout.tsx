import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { ScrollCharacter } from "@/components/ui/ScrollCharacter";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: { default: "Suhbatdosh — AI bilan suhbatga tayyorlaning", template: "%s · Suhbatdosh" },
  description: "Ish suhbatlarini AI suhbatdosh bilan ovoz chiqarib mashq qiling va batafsil, halol fikr-mulohaza oling.",
};

export const viewport: Viewport = { themeColor: "#f6f8fc" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${manrope.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <ScrollCharacter />
      </body>
    </html>
  );
}
