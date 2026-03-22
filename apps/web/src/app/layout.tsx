import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beach RegisTree — CSULB Course Planner",
  description:
    "Interactive prerequisite graph and semester planner for CSULB Computer Science students.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-beach-dark text-zinc-200 antialiased">
        {children}
      </body>
    </html>
  );
}
