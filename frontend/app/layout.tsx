import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "PolicyLens · Understand your cover",
  description:
    "Evidence-backed policy answers and a transparent treatment estimate. FIN01 · HackMatrix 5.0.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
