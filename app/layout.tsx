import "./globals.css";
import Navigation from "@/components/Navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sri Ragavendra Air Travels",
  description: "Sri Ragavendra Air Travels - Travel Agency CRM",
  icons: {
    icon: "/srlogo.jpeg",
    shortcut: "/srlogo.jpeg",
    apple: "/srlogo.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}