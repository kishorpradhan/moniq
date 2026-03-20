import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Portfolio Intelligence",
  description: "Portfolio analytics app with mock data",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
