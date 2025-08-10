import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import clsx from "clsx";
import "./globals.css";

const schibested_grotesk = Schibsted_Grotesk({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "C13 Metastasis Analyzer",
  description: "Hackathon dashboard for hyperpolarized C13-pyruvate MRI analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" sizes="any" />
      </head>
      <body className={clsx(schibested_grotesk.className, "dark bg-neutral-950 text-neutral-50 overflow-hidden")}>{children}</body>
    </html>
  );
}
