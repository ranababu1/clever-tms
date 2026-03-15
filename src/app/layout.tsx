import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clever TMS — Translate Anything",
  description: "AI-powered translation tool using Google Gemini. Translates anything and everything.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="antialiased min-h-screen text-gray-300">
        {children}
      </body>
    </html>
  );
}
