import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { AuthGuard } from "@/components/AuthGuard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sri Ragavendra Air Travels",
  description: "Sri Ragavendra Air Travels - Travel Agency CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthGuard>
          <Navigation />
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}