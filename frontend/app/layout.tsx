import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "SEC Filing Analyzer",
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
