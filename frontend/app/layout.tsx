import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "10-Q / 10-K Analyzer",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}