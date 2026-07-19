import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDF Insight",
  description: "Ask reliable questions about your PDFs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
