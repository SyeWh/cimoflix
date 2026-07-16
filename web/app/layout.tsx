import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CimoFlix",
  description: "Personal media library for a modded Xbox 360",
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
